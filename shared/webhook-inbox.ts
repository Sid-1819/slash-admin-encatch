export type WebhookRequest = {
	id: string;
	receivedAt: string;
	method: string;
	contentType: string;
	bytes: number;
	responseId: string | null;
	headers: Record<string, string>;
	body: string;
};
export type WebhookRequestSummary = Omit<WebhookRequest, "headers" | "body">;
export const WEBHOOK_RECEIVE_PATH = "/api/webhooks/receive";
export const WEBHOOK_REQUESTS_PATH = "/api/webhooks/requests";
export const webhookReceiverUrl = (origin: string) => new URL(WEBHOOK_RECEIVE_PATH, origin).href;
