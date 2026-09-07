import { Icon } from "@/components/icon";
import { buildShareableSignedUrl, generateHmacSha256Hex } from "@/lib/hmac-signature";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text } from "@/ui/typography";
import { Check, Copy, KeyRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_BASE_URL = "encatch_hmac_gen_base_url";
const STORAGE_CONTACT_ID = "encatch_hmac_gen_contact_id";

function getStored(key: string): string {
	try {
		return localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

function setStored(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// ignore
	}
}

function CopyField({ label, value, id }: { label: string; value: string; id: string }) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		if (!value) return;
		await navigator.clipboard.writeText(value);
		setCopied(true);
		toast.success(`${label} copied`);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</Label>
			<div className="flex gap-2">
				<Input id={id} readOnly value={value} className="font-mono text-xs" />
				<Button type="button" variant="outline" size="icon" onClick={() => void copy()} disabled={!value} aria-label={`Copy ${label}`}>
					{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
				</Button>
			</div>
		</div>
	);
}

export default function EncatchHmacGeneratorPage() {
	const [baseUrl, setBaseUrl] = useState(() => getStored(STORAGE_BASE_URL));
	const [contactId, setContactId] = useState(() => getStored(STORAGE_CONTACT_ID));
	const [secretKey, setSecretKey] = useState("");
	const [includeTimestamp, setIncludeTimestamp] = useState(false);
	const [timestampMs, setTimestampMs] = useState("");
	const [signature, setSignature] = useState("");
	const [signedUrl, setSignedUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);

	useEffect(() => {
		setStored(STORAGE_BASE_URL, baseUrl);
	}, [baseUrl]);

	useEffect(() => {
		setStored(STORAGE_CONTACT_ID, contactId);
	}, [contactId]);

	const generate = useCallback(async () => {
		setError(null);
		const id = contactId.trim();
		const secret = secretKey.trim();
		const base = baseUrl.trim();

		if (!id) {
			setError("Enter a contact_id (or email when email is the only identifier).");
			setSignature("");
			setSignedUrl("");
			return;
		}
		if (!secret) {
			setError("Enter the shareable link Secret Key from admin (Share → Security Configuration).");
			setSignature("");
			setSignedUrl("");
			return;
		}

		setGenerating(true);
		try {
			const ts = includeTimestamp ? String(timestampMs.trim() || Date.now()) : undefined;
			if (includeTimestamp && ts) {
				setTimestampMs(ts);
			}
			const sig = await generateHmacSha256Hex(id, secret, ts);
			setSignature(sig);
			if (base) {
				setSignedUrl(buildShareableSignedUrl(base, id, sig, ts));
			} else {
				setSignedUrl("");
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setSignature("");
			setSignedUrl("");
		} finally {
			setGenerating(false);
		}
	}, [baseUrl, contactId, secretKey, includeTimestamp, timestampMs]);

	useEffect(() => {
		if (!contactId.trim() || !secretKey.trim()) {
			setSignature("");
			setSignedUrl("");
			return;
		}
		const timer = window.setTimeout(() => {
			void generate();
		}, 300);
		return () => window.clearTimeout(timer);
	}, [contactId, secretKey, includeTimestamp, timestampMs, baseUrl, generate]);

	const refreshTimestamp = () => {
		setTimestampMs(String(Date.now()));
	};

	return (
		<div className="flex flex-col gap-6 max-w-3xl">
			<div className="flex items-center gap-2">
				<Icon icon="solar:key-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch HMAC Generator</h2>
					<Text variant="body2" className="text-muted-foreground">
						Generate <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">contact_signature</code> for shareable
						feedback links. Signs{" "}
						<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">HMAC-SHA256(contact_id, secret)</code> per{" "}
						<a
							href="https://dev.encatch.com/docs/shareable-feedback/user-identification#optional-identity-verification"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							User Identification docs
						</a>
						. Never expose the secret in browser production code — this tool is for internal testing only.
					</Text>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<KeyRound className="h-4 w-4" />
						Inputs
					</CardTitle>
					<CardDescription>
						Use the Secret Key from the form&apos;s Share tab → Security Configuration. The signed value is{" "}
						<code className="font-mono text-xs">contact_id</code> (or email if that is the only identifier).
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="hmac-base-url">Shareable base URL (optional)</Label>
						<Input
							id="hmac-base-url"
							value={baseUrl}
							onChange={(e) => setBaseUrl(e.target.value)}
							placeholder="https://form.dev.encatch.com/s/your-link-id"
							className="font-mono text-sm"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="hmac-contact-id">contact_id</Label>
						<Input
							id="hmac-contact-id"
							value={contactId}
							onChange={(e) => setContactId(e.target.value)}
							placeholder="customer_014"
							className="font-mono text-sm"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="hmac-secret-key">Secret Key</Label>
						<Input
							id="hmac-secret-key"
							type="password"
							value={secretKey}
							onChange={(e) => setSecretKey(e.target.value)}
							placeholder="Shareable link secret (UUID)"
							className="font-mono text-sm"
							autoComplete="off"
						/>
					</div>
					<label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
						<input
							type="checkbox"
							checked={includeTimestamp}
							onChange={(e) => {
								setIncludeTimestamp(e.target.checked);
								if (e.target.checked && !timestampMs) {
									setTimestampMs(String(Date.now()));
								}
							}}
							disabled={!secretKey.trim()}
							className="rounded"
						/>
						Include <code className="font-mono text-xs">contact_signature_time</code> — required when session timeout is
						configured on the link
					</label>
					{includeTimestamp ? (
						<div className="flex flex-wrap items-end gap-2">
							<div className="min-w-0 flex-1 space-y-1.5">
								<Label htmlFor="hmac-timestamp">Timestamp (Unix ms)</Label>
								<Input
									id="hmac-timestamp"
									value={timestampMs}
									onChange={(e) => setTimestampMs(e.target.value)}
									placeholder={String(Date.now())}
									className="font-mono text-sm"
								/>
							</div>
							<Button type="button" variant="outline" size="sm" onClick={refreshTimestamp}>
								Use now
							</Button>
						</div>
					) : null}
					<div className="flex gap-2">
						<Button type="button" onClick={() => void generate()} disabled={generating}>
							{generating ? "Generating…" : "Generate"}
						</Button>
					</div>
					{error ? (
						<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
							{error}
						</div>
					) : null}
				</CardContent>
			</Card>

			{signature ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Output</CardTitle>
						<CardDescription>Copy the signature or full signed URL into your shareable link test.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<CopyField label="contact_signature (hex)" value={signature} id="hmac-output-signature" />
						{includeTimestamp && timestampMs ? (
							<CopyField label="contact_signature_time" value={timestampMs} id="hmac-output-timestamp" />
						) : null}
						{signedUrl ? <CopyField label="Signed shareable URL" value={signedUrl} id="hmac-output-url" /> : null}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
