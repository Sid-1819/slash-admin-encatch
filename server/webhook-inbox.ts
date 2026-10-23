import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { WebhookRequest } from "../shared/webhook-inbox.ts";

export const MAX_WEBHOOK_BYTES = 1024 * 1024;
export const MAX_WEBHOOK_REQUESTS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Inbox = { requests: WebhookRequest[] };

function json(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
	res.end(JSON.stringify(body));
}

function findResponseId(value: unknown, depth = 0): string | null {
	if (!value || typeof value !== "object" || depth > 10) return null;
	const object = value as Record<string, unknown>;
	if (typeof object.responseId === "string") return object.responseId;
	for (const child of Object.values(object)) {
		const found = findResponseId(child, depth + 1);
		if (found) return found;
	}
	return null;
}

/** One shared receiver and request history, independent of browser or hostname. */
export function createWebhookMiddleware(directory: string) {
	const file = path.join(directory, "requests.json");
	const read = (): Inbox => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { requests: [] });
	const save = (inbox: Inbox) => {
		fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
		const temporary = `${file}.tmp`;
		fs.writeFileSync(temporary, JSON.stringify(inbox), { mode: 0o600 });
		fs.renameSync(temporary, file);
	};
	return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const pathname = (req.url ?? "").split("?")[0];
		if (!pathname.startsWith("/api/webhooks/")) return next();
		try {
			const match = pathname.match(/^\/api\/webhooks\/(receive|requests)(?:\/([^/]+))?$/);
			if (!match || (match[2] && !UUID.test(match[2]))) return json(res, 404, { error: "Webhook route not found" });
			const [, action, requestId] = match;
			if (action === "receive" && !requestId) {
				if (req.method !== "POST") {
					res.setHeader("Allow", "POST");
					return json(res, 405, { error: "Use POST to send a webhook" });
				}
				let bytes = 0;
				const chunks: Buffer[] = [];
				let tooLarge = false;
				for await (const chunk of req) {
					bytes += Buffer.byteLength(chunk);
					if (bytes > MAX_WEBHOOK_BYTES) {
						if (!tooLarge) json(res, 413, { error: "Webhook exceeds the 1 MB limit" });
						tooLarge = true;
					} else if (!tooLarge) chunks.push(Buffer.from(chunk));
				}
				if (tooLarge) return;
				const body = Buffer.concat(chunks).toString("utf8");
				let responseId: string | null = null;
				try {
					responseId = findResponseId(JSON.parse(body));
				} catch {
					/* Preserve non-JSON and multipart bodies as text. */
				}
				const headers: Record<string, string> = {};
				for (const [key, value] of Object.entries(req.headers)) {
					if (value !== undefined) headers[key] = /authorization|cookie|token|api[-_]?key|secret/i.test(key) ? "[redacted]" : String(value);
				}
				const entry: WebhookRequest = {
					id: randomUUID(),
					receivedAt: new Date().toISOString(),
					method: req.method,
					contentType: String(req.headers["content-type"] ?? ""),
					bytes,
					responseId,
					headers,
					body,
				};
				// Read after the body arrives, so concurrent deliveries cannot overwrite one another.
				const inbox = read();
				inbox.requests = [entry, ...inbox.requests].slice(0, MAX_WEBHOOK_REQUESTS);
				save(inbox);
				return json(res, 200, { received: true, requestId: entry.id });
			}
			if (action === "requests" && req.method === "GET") {
				const inbox = read();
				if (requestId) {
					const entry = inbox.requests.find((item) => item.id === requestId);
					return entry ? json(res, 200, entry) : json(res, 404, { error: "Request not found" });
				}
				return json(
					res,
					200,
					inbox.requests.map(({ id, receivedAt, method, contentType, bytes, responseId }) => ({ id, receivedAt, method, contentType, bytes, responseId })),
				);
			}
			if (action === "requests" && req.method === "DELETE") {
				const inbox = read();
				const before = inbox.requests.length;
				if (requestId && !inbox.requests.some((item) => item.id === requestId)) return json(res, 404, { error: "Request not found" });
				inbox.requests = requestId ? inbox.requests.filter((item) => item.id !== requestId) : [];
				save(inbox);
				return json(res, 200, { deleted: before - inbox.requests.length });
			}
			return json(res, 405, { error: "Method not allowed" });
		} catch {
			if (!res.headersSent) json(res, 500, { error: "Unable to store or read this webhook" });
		}
	};
}

export function webhookInboxPlugin(directory?: string): Plugin {
	const middleware = createWebhookMiddleware(path.resolve(directory || process.env.WEBHOOK_STORAGE_DIR || ".webhooks"));
	return {
		name: "webhook-inbox",
		configureServer(server) {
			server.middlewares.use(middleware);
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware);
		},
	};
}
