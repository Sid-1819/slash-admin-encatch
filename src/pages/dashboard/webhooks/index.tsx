import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Trash2, Webhook } from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { WEBHOOK_REQUESTS_PATH, webhookReceiverUrl, type WebhookRequest, type WebhookRequestSummary } from "../../../../shared/webhook-inbox";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, { cache: "no-store", ...options });
	if (!response.ok) throw new Error(`Webhook request failed (${response.status})`);
	return response.json();
}
function formatBody(body: string) {
	try {
		return JSON.stringify(JSON.parse(body), null, 2);
	} catch {
		return body;
	}
}

export default function WebhooksPage() {
	const [requests, setRequests] = useState<WebhookRequestSummary[]>([]);
	const [selected, setSelected] = useState<WebhookRequest | null>(null);
	const [error, setError] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<WebhookRequestSummary | "all" | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const listRevision = useRef(0);
	const detailsRevision = useRef(0);
	const refresh = useCallback(() => {
		const revision = ++listRevision.current;
		return api<WebhookRequestSummary[]>(WEBHOOK_REQUESTS_PATH).then(
			(requests) => {
				if (revision !== listRevision.current) return;
				setRequests(requests);
				setError("");
				setSelected((current) => (current && requests.some((item) => item.id === current.id) ? current : null));
			},
			(error) => {
				if (revision === listRevision.current) setError(error instanceof Error ? error.message : "Unable to load requests");
			},
		);
	}, []);
	useEffect(() => {
		if (deleting) return;
		void refresh();
		const timer = setInterval(() => void refresh(), 5000);
		return () => clearInterval(timer);
	}, [refresh, deleting]);
	const open = async (id: string) => {
		const revision = ++detailsRevision.current;
		try {
			const request = await api<WebhookRequest>(`${WEBHOOK_REQUESTS_PATH}/${id}`);
			if (revision === detailsRevision.current) setSelected(request);
		} catch {
			toast.error("Unable to load webhook details");
		}
	};
	const confirmDelete = async () => {
		if (!deleteTarget || deleting) return;
		setDeleting(true);
		setDeleteError("");
		++listRevision.current;
		++detailsRevision.current;
		try {
			await api<{ deleted: number }>(deleteTarget === "all" ? WEBHOOK_REQUESTS_PATH : `${WEBHOOK_REQUESTS_PATH}/${deleteTarget.id}`, { method: "DELETE" });
			setRequests((current) => (deleteTarget === "all" ? [] : current.filter((item) => item.id !== deleteTarget.id)));
			setSelected((current) => (deleteTarget === "all" || current?.id === deleteTarget.id ? null : current));
			setDeleteTarget(null);
			toast.success(deleteTarget === "all" ? "All webhook requests cleared" : "Webhook request deleted");
			await refresh();
		} catch {
			setDeleteError("Unable to delete requests. Please try again.");
		} finally {
			setDeleting(false);
		}
	};
	const receiver = webhookReceiverUrl(window.location.origin);
	return (
		<div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-10">
			<div className="flex items-center gap-3">
				<Webhook className="size-7 text-primary" />
				<div>
					<h1 className="text-2xl font-semibold">Webhooks</h1>
					<p className="text-sm text-muted-foreground">Receive and inspect feedback notifications on your own endpoint.</p>
				</div>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Receiving URL</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<code className="min-w-0 flex-1 break-all rounded-lg border bg-muted/30 p-3 text-sm" data-testid="webhook-receiver-url">
							{receiver}
						</code>
						<Button
							variant="outline"
							onClick={() =>
								void navigator.clipboard.writeText(receiver).then(
									() => toast.success("Receiving URL copied"),
									() => toast.error("Unable to copy URL"),
								)
							}
						>
							<Copy />
							Copy URL
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						Use POST with this URL in your Webhook Notification destination. Requests refresh every 5 seconds. The latest 50 are retained, up to 1 MB each.
					</p>
					{error && (
						<div role="alert" className="text-sm text-destructive">
							{error}
						</div>
					)}
				</CardContent>
			</Card>
			<div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
				<Card>
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
						<CardTitle>Incoming requests ({requests.length})</CardTitle>
						<div className="flex gap-2">
							<Button variant="outline" disabled={deleting} onClick={() => void refresh()}>
								<RefreshCw />
								Refresh
							</Button>
							<Button
								variant="destructive"
								disabled={deleting || !requests.length}
								onClick={() => {
									setDeleteError("");
									setDeleteTarget("all");
								}}
							>
								<Trash2 />
								Clear all
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{!requests.length ? (
							<p className="py-10 text-center text-sm text-muted-foreground">Waiting for a webhook. Send a connector test or submit your form.</p>
						) : (
							<div className="space-y-2">
								{requests.map((item) => (
									<div key={item.id} className="relative">
										<button
											type="button"
											disabled={deleting}
											onClick={() => void open(item.id)}
											className={`w-full rounded-lg border p-3 pr-14 text-left hover:bg-accent ${selected?.id === item.id ? "border-primary bg-accent" : ""}`}
										>
											<div className="flex justify-between gap-2 text-sm">
												<span className="font-semibold text-emerald-500">{item.method} · Received</span>
												<span className="text-muted-foreground">{new Date(item.receivedAt).toLocaleTimeString()}</span>
											</div>
											<div className="mt-1 break-all text-xs text-muted-foreground">
												{item.contentType || "No content type"} · {item.bytes.toLocaleString()} bytes
											</div>
											{item.responseId && <div className="mt-2 break-all font-mono text-xs">{item.responseId}</div>}
										</button>
										<Button
											variant="ghost"
											size="icon"
											className="absolute right-2 top-2 text-destructive"
											disabled={deleting}
											aria-label={`Delete request ${item.responseId || item.id}`}
											onClick={() => {
												setDeleteError("");
												setDeleteTarget(item);
											}}
										>
											<Trash2 />
										</Button>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Request details</CardTitle>
					</CardHeader>
					<CardContent className="min-w-0 space-y-4">
						{selected ? (
							<>
								<p className="text-sm text-muted-foreground">Received {new Date(selected.receivedAt).toLocaleString()} · HTTP 200</p>
								<h2 className="text-sm font-semibold">Headers</h2>
								<pre className="max-h-52 overflow-auto rounded-lg bg-muted/30 p-4 text-xs">{JSON.stringify(selected.headers, null, 2)}</pre>
								<h2 className="text-sm font-semibold">Payload</h2>
								<pre data-testid="webhook-payload" className="max-h-[600px] overflow-auto rounded-lg bg-muted/30 p-4 text-xs">
									{formatBody(selected.body)}
								</pre>
							</>
						) : (
							<p className="py-10 text-center text-sm text-muted-foreground">Select a request to inspect its headers and payload.</p>
						)}
					</CardContent>
				</Card>
			</div>
			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open && !deleting) setDeleteTarget(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{deleteTarget === "all" ? "Clear all webhook requests?" : "Delete this webhook request?"}</DialogTitle>
						<DialogDescription>
							{deleteTarget === "all"
								? "This permanently deletes all captured webhook requests and their payloads. New incoming requests will still be received."
								: "This permanently deletes the selected request, including its headers and payload."}
						</DialogDescription>
					</DialogHeader>
					{deleteTarget && deleteTarget !== "all" && <p className="break-all text-sm text-muted-foreground">{deleteTarget.responseId || deleteTarget.id}</p>}
					{deleteError && (
						<p role="alert" className="text-sm text-destructive">
							{deleteError}
						</p>
					)}
					<DialogFooter>
						<Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
							Cancel
						</Button>
						<Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
							{deleting ? "Deleting…" : deleteTarget === "all" ? "Clear all requests" : "Delete request"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
