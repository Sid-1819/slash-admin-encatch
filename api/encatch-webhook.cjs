const ENCATCH_WEBHOOK_PATH = "/api/encatch-webhook";
const MAX_CAPTURES = 50;

function getStore() {
	if (!globalThis.__encatchWebhookCaptures) {
		globalThis.__encatchWebhookCaptures = [];
	}
	return globalThis.__encatchWebhookCaptures;
}

function listCaptures() {
	return [...getStore()];
}

function clearCaptures() {
	globalThis.__encatchWebhookCaptures = [];
}

function addCapture(entry) {
	const capture = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		receivedAt: new Date().toISOString(),
		...entry,
	};
	const store = getStore();
	store.unshift(capture);
	if (store.length > MAX_CAPTURES) {
		store.length = MAX_CAPTURES;
	}
	return capture;
}

function normalizeHeaders(headers) {
	const out = {};
	for (const [key, value] of Object.entries(headers || {})) {
		if (value === undefined) continue;
		out[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
	}
	return out;
}

function previewRawBody(raw, max = 4000) {
	if (raw == null) return null;
	if (raw.length <= max) return raw;
	return `${raw.slice(0, max)}… [truncated ${raw.length - max} chars]`;
}

function readRawBody(body) {
	if (body == null || body === "") {
		return { parsed: null, raw: null };
	}

	if (typeof body === "string") {
		try {
			return { parsed: JSON.parse(body), raw: body };
		} catch {
			return { parsed: body, raw: body };
		}
	}

	if (Buffer.isBuffer(body)) {
		const raw = body.toString("utf8");
		try {
			return { parsed: JSON.parse(raw), raw };
		} catch {
			return { parsed: raw, raw };
		}
	}

	if (typeof body === "object") {
		return { parsed: body, raw: JSON.stringify(body) };
	}

	return { parsed: body, raw: String(body) };
}

function handleRequest(method, headers, body) {
	const verb = (method || "GET").toUpperCase();

	if (verb === "GET") {
		return {
			status: 200,
			body: {
				ok: true,
				path: ENCATCH_WEBHOOK_PATH,
				captures: listCaptures(),
			},
		};
	}

	if (verb === "DELETE") {
		clearCaptures();
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
	const { parsed, raw } = readRawBody(body);

	const capture = addCapture({
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

module.exports = async function handler(req, res) {
	try {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

		const result = handleRequest(req.method, req.headers, req.body);

		if (result.body == null) {
			res.status(result.status).end();
			return;
		}

		res.status(result.status).json(result.body);
	} catch (error) {
		res.status(500).json({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
