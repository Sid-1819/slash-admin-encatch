export const ENCATCH_WEBHOOK_PATH = "/api/encatch-webhook";

export type EncatchWebhookCapture = {
	id: string;
	receivedAt: string;
	method: string;
	contentType: string | null;
	headers: Record<string, string>;
	body: unknown;
	rawBodyPreview: string | null;
};

export function getEncatchWebhookUrl(origin = typeof window !== "undefined" ? window.location.origin : ""): string {
	return `${origin}${ENCATCH_WEBHOOK_PATH}`;
}

type WebhookListResponse = {
	ok: boolean;
	path: string;
	captures: EncatchWebhookCapture[];
};

export async function fetchEncatchWebhookCaptures(): Promise<EncatchWebhookCapture[]> {
	const res = await fetch(ENCATCH_WEBHOOK_PATH, { method: "GET" });
	if (!res.ok) {
		throw new Error(`Failed to load webhook captures (${res.status})`);
	}
	const data = (await res.json()) as WebhookListResponse;
	return data.captures ?? [];
}

export async function clearEncatchWebhookCaptures(): Promise<void> {
	const res = await fetch(ENCATCH_WEBHOOK_PATH, { method: "DELETE" });
	if (!res.ok) {
		throw new Error(`Failed to clear webhook captures (${res.status})`);
	}
}

export async function sendEncatchWebhookTestPayload(payload: Record<string, unknown>): Promise<void> {
	const res = await fetch(ENCATCH_WEBHOOK_PATH, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `Test POST failed (${res.status})`);
	}
}
