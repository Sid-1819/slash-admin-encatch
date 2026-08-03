import { addEncatchWebhookCapture, clearEncatchWebhookCaptures, ENCATCH_WEBHOOK_PATH, listEncatchWebhookCaptures } from "./encatch-webhook-store";

export { ENCATCH_WEBHOOK_PATH };

type IncomingHeaders = Record<string, string | string[] | undefined>;

function normalizeHeaders(headers: IncomingHeaders): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		out[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
	}
	return out;
}

function previewRawBody(raw: string | null, max = 4000): string | null {
	if (raw == null) return null;
	if (raw.length <= max) return raw;
	return `${raw.slice(0, max)}… [truncated ${raw.length - max} chars]`;
}

async function readRawBody(body: unknown, getRawText?: () => Promise<string>): Promise<{ parsed: unknown; raw: string | null }> {
	if (typeof getRawText === "function") {
		const raw = await getRawText();
		if (!raw.trim()) return { parsed: null, raw: "" };
		try {
			return { parsed: JSON.parse(raw) as unknown, raw };
		} catch {
			return { parsed: raw, raw };
		}
	}

	if (body == null || body === "") {
		return { parsed: null, raw: null };
	}

	if (typeof body === "string") {
		try {
			return { parsed: JSON.parse(body) as unknown, raw: body };
		} catch {
			return { parsed: body, raw: body };
		}
	}

	if (Buffer.isBuffer(body)) {
		const raw = body.toString("utf8");
		try {
			return { parsed: JSON.parse(raw) as unknown, raw };
		} catch {
			return { parsed: raw, raw };
		}
	}

	if (typeof body === "object") {
		return { parsed: body, raw: JSON.stringify(body) };
	}

	return { parsed: body, raw: String(body) };
}

export type EncatchWebhookHandlerResult = {
	status: number;
	body: unknown;
};

export async function handleEncatchWebhookRequest(
	method: string | undefined,
	headers: IncomingHeaders,
	body: unknown,
	getRawText?: () => Promise<string>,
): Promise<EncatchWebhookHandlerResult> {
	const verb = (method ?? "GET").toUpperCase();

	if (verb === "GET") {
		return {
			status: 200,
			body: {
				ok: true,
				path: ENCATCH_WEBHOOK_PATH,
				captures: listEncatchWebhookCaptures(),
			},
		};
	}

	if (verb === "DELETE") {
		clearEncatchWebhookCaptures();
		return { status: 200, body: { ok: true, cleared: true } };
	}

	if (verb === "OPTIONS") {
		return { status: 204, body: null };
	}

	if (verb !== "POST") {
		return { status: 405, body: { ok: false, error: "Method not allowed" } };
	}

	const normalizedHeaders = normalizeHeaders(headers);
	const contentType = normalizedHeaders["content-type"] ?? null;
	const { parsed, raw } = await readRawBody(body, getRawText);

	const capture = addEncatchWebhookCapture({
		method: verb,
		contentType,
		headers: normalizedHeaders,
		body: parsed,
		rawBodyPreview: previewRawBody(raw),
	});

	return {
		status: 200,
		body: { ok: true, id: capture.id, receivedAt: capture.receivedAt },
	};
}
