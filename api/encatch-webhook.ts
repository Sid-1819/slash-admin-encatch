import { handleEncatchWebhookRequest } from "../server/encatch-webhook-handler";

type VercelRequest = {
	method?: string;
	body?: unknown;
	headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
	status: (code: number) => VercelResponse;
	setHeader: (name: string, value: string) => void;
	json: (body: unknown) => void;
	end: () => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	const result = await handleEncatchWebhookRequest(req.method, req.headers ?? {}, req.body);

	if (result.body == null) {
		res.status(result.status).end();
		return;
	}

	res.status(result.status).json(result.body);
}
