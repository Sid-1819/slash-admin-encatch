export type EncatchWebhookCapture = {
	id: string;
	receivedAt: string;
	method: string;
	contentType: string | null;
	headers: Record<string, string>;
	body: unknown;
	rawBodyPreview: string | null;
};

export const ENCATCH_WEBHOOK_PATH = "/api/encatch-webhook";

const MAX_CAPTURES = 50;

declare global {
	// eslint-disable-next-line no-var
	var __encatchWebhookCaptures: EncatchWebhookCapture[] | undefined;
}

function getStore(): EncatchWebhookCapture[] {
	if (!globalThis.__encatchWebhookCaptures) {
		globalThis.__encatchWebhookCaptures = [];
	}
	return globalThis.__encatchWebhookCaptures;
}

export function listEncatchWebhookCaptures(): EncatchWebhookCapture[] {
	return [...getStore()];
}

export function clearEncatchWebhookCaptures(): void {
	globalThis.__encatchWebhookCaptures = [];
}

export function addEncatchWebhookCapture(entry: Omit<EncatchWebhookCapture, "id" | "receivedAt">): EncatchWebhookCapture {
	const capture: EncatchWebhookCapture = {
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
