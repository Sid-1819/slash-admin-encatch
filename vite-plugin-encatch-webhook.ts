import type { Plugin } from "vite";
import { handleEncatchWebhookRequest, ENCATCH_WEBHOOK_PATH } from "./server/encatch-webhook-handler";

function readRequestBody(req: import("node:http").IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}

export function encatchWebhookPlugin(): Plugin {
	return {
		name: "encatch-webhook",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url?.split("?")[0];
				if (url !== ENCATCH_WEBHOOK_PATH) {
					next();
					return;
				}

				try {
					const result = await handleEncatchWebhookRequest(req.method, req.headers as Record<string, string | string[] | undefined>, undefined, () =>
						readRequestBody(req),
					);

					res.statusCode = result.status;
					res.setHeader("Content-Type", "application/json; charset=utf-8");
					res.setHeader("Access-Control-Allow-Origin", "*");
					res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
					res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

					if (result.body == null) {
						res.end();
						return;
					}

					res.end(JSON.stringify(result.body));
				} catch (error) {
					res.statusCode = 500;
					res.setHeader("Content-Type", "application/json; charset=utf-8");
					res.end(
						JSON.stringify({
							ok: false,
							error: error instanceof Error ? error.message : String(error),
						}),
					);
				}
			});
		},
	};
}
