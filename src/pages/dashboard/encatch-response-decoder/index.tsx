import { Icon } from "@/components/icon";
import { decodeEncatchResponseNode } from "@/lib/encatch-response-decode";
import "@/utils/highlight";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Label } from "@/ui/label";
import { ScrollArea } from "@/ui/scroll-area";
import { Textarea } from "@/ui/textarea";
import { Text } from "@/ui/typography";
import hljs from "highlight.js";
import { useCallback, useMemo, useState } from "react";

export default function EncatchResponseDecoderPage() {
	const [input, setInput] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [decodedJson, setDecodedJson] = useState<string | null>(null);

	const highlightedHtml = useMemo(() => {
		if (!decodedJson) return "";
		try {
			return hljs.highlight(decodedJson, { language: "json" }).value;
		} catch {
			return "";
		}
	}, [decodedJson]);

	const handleDecode = useCallback(() => {
		setError(null);
		setDecodedJson(null);
		const trimmed = input.trim();
		if (!trimmed) {
			setError("Please paste encoded JSON first.");
			return;
		}
		try {
			const parsed: unknown = JSON.parse(trimmed);
			const decoded = decodeEncatchResponseNode(parsed);
			setDecodedJson(JSON.stringify(decoded, null, 2));
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, [input]);

	const handleClear = useCallback(() => {
		setInput("");
		setError(null);
		setDecodedJson(null);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:code-square-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch JSON decoder</h2>
					<Text variant="body2" className="text-muted-foreground">
						Paste wire-format Encatch JSON and decode it to readable JSON (objects with type keys, arrays, and scalars).
					</Text>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Input</CardTitle>
					<CardDescription>Paste encoded JSON from an Encatch API response or log.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="encatch-decode-input">Encoded JSON</Label>
						<Textarea
							id="encatch-decode-input"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder='Paste encoded JSON here, e.g. {"t":10,"p":{...}}'
							className="min-h-[250px] font-mono text-sm"
							spellCheck={false}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={handleDecode}>
							Decode JSON
						</Button>
						<Button type="button" variant="outline" onClick={handleClear}>
							Clear
						</Button>
					</div>
					{error && (
						<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
							{error}
						</div>
					)}
				</CardContent>
			</Card>

			{decodedJson && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Decoded output</CardTitle>
						<CardDescription>Pretty-printed JSON after decoding Encatch node wrappers.</CardDescription>
					</CardHeader>
					<CardContent>
						<ScrollArea className="max-h-[min(600px,70vh)] rounded-md border border-border">
							<pre className="m-0 p-4 text-sm">
								{highlightedHtml ? (
									<code
										className="hljs language-json font-mono whitespace-pre-wrap break-words"
										// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted JSON from local decode + hljs
										dangerouslySetInnerHTML={{ __html: highlightedHtml }}
									/>
								) : (
									<code className="hljs language-json font-mono whitespace-pre-wrap break-words">{decodedJson}</code>
								)}
							</pre>
						</ScrollArea>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
