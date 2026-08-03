import { Icon } from "@/components/icon";
import {
	clearEncatchWebhookCaptures,
	fetchEncatchWebhookCaptures,
	getEncatchWebhookUrl,
	sendEncatchWebhookTestPayload,
	type EncatchWebhookCapture,
} from "@/lib/encatch-webhook-api";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { ScrollArea } from "@/ui/scroll-area";
import { Text } from "@/ui/typography";
import { cn } from "@/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function CaptureCard({ capture }: { capture: EncatchWebhookCapture }) {
	const [open, setOpen] = useState(true);
	const received = new Date(capture.receivedAt).toLocaleString();

	return (
		<Card className="overflow-hidden border-border/60">
			<CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/40">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<CardTitle className="text-sm font-semibold">
							{capture.method} · {capture.id}
						</CardTitle>
						<CardDescription className="text-xs mt-0.5">{received}</CardDescription>
					</div>
					<Button type="button" variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
						{open ? "Collapse" : "Expand"}
					</Button>
				</div>
				{capture.contentType && (
					<Text variant="caption" className="text-muted-foreground font-mono text-[11px] mt-1">
						Content-Type: {capture.contentType}
					</Text>
				)}
			</CardHeader>
			{open && (
				<CardContent className="p-0">
					<ScrollArea className="h-[min(360px,45vh)]">
						<pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">{formatJson(capture.body)}</pre>
					</ScrollArea>
				</CardContent>
			)}
		</Card>
	);
}

export default function EncatchWebhookTestPage() {
	const [captures, setCaptures] = useState<EncatchWebhookCapture[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [polling, setPolling] = useState(true);

	const webhookUrl = useMemo(() => getEncatchWebhookUrl(), []);

	const refresh = useCallback(async () => {
		try {
			const next = await fetchEncatchWebhookCaptures();
			setCaptures(next);
			setError(null);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if (!polling) return;
		const id = window.setInterval(() => {
			void refresh();
		}, 2500);
		return () => window.clearInterval(id);
	}, [polling, refresh]);

	const handleCopyUrl = async () => {
		try {
			await navigator.clipboard.writeText(webhookUrl);
			toast.success("Webhook URL copied");
		} catch {
			toast.error("Could not copy URL");
		}
	};

	const handleClear = async () => {
		try {
			await clearEncatchWebhookCaptures();
			setCaptures([]);
			toast.success("Webhook log cleared");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	};

	const handleTestPost = async () => {
		try {
			await sendEncatchWebhookTestPayload({
				source: "slash-admin-encatch",
				message: "Test webhook from Encatch Webhook Test page",
				receivedAt: new Date().toISOString(),
			});
			await refresh();
			toast.success("Test POST sent");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:link-round-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch Webhook Test</h2>
					<Text variant="body2" className="text-muted-foreground">
						Use this URL as the Encatch Webhook destination. Incoming POST requests appear below automatically.
					</Text>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Webhook URL</CardTitle>
					<CardDescription>In Encatch → Destinations → Webhook: set this URL, method POST, content type application/json.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="encatch-webhook-url">Endpoint</Label>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input id="encatch-webhook-url" readOnly value={webhookUrl} className="font-mono text-sm" />
							<div className="flex flex-wrap gap-2 shrink-0">
								<Button type="button" onClick={() => void handleCopyUrl()}>
									Copy URL
								</Button>
								<Button type="button" variant="outline" onClick={() => void handleTestPost()}>
									Send test POST
								</Button>
							</div>
						</div>
					</div>

					<div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground space-y-1">
						<p>
							<strong className="text-foreground">Local dev:</strong> run <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">pnpm dev</code> and
							use <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{webhookUrl}</code>.
						</p>
						<p>
							<strong className="text-foreground">Encatch cloud → your laptop:</strong> expose port 3001 with ngrok/cloudflared and paste the public URL +{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">/api/encatch-webhook</code>.
						</p>
						<p>
							<strong className="text-foreground">Deployed (Vercel):</strong> use your site origin +{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">/api/encatch-webhook</code>.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
					<div>
						<CardTitle className="text-base">Received webhooks</CardTitle>
						<CardDescription>{captures.length === 0 ? "No requests yet." : `${captures.length} capture(s), newest first.`}</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
							Refresh
						</Button>
						<Button type="button" variant={polling ? "default" : "outline"} size="sm" onClick={() => setPolling((v) => !v)}>
							{polling ? "Auto-refresh on" : "Auto-refresh off"}
						</Button>
						<Button type="button" variant="destructive" size="sm" onClick={() => void handleClear()}>
							Clear
						</Button>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{error && (
						<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
							{error}
						</div>
					)}
					{!error && captures.length === 0 && !loading && (
						<div className={cn("rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground")}>
							Waiting for POST requests… trigger Encatch Test & Enable Destination or submit feedback.
						</div>
					)}
					{captures.map((capture) => (
						<CaptureCard key={capture.id} capture={capture} />
					))}
				</CardContent>
			</Card>
		</div>
	);
}
