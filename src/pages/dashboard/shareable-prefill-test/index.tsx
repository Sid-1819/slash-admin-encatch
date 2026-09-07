import { Icon } from "@/components/icon";
import { appendParams } from "@/lib/shareable-url-params";
import {
	URL_PREFILL_CONTEXT_WELCOME_NOTE,
	URL_PREFILL_FORM_TITLE,
} from "@/lib/shareable/url-prefill-form-catalog";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text } from "@/ui/typography";
import { Check, Copy, ExternalLink, Pencil, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import {
	URL_CONTACT_DOC_SECTIONS,
	URL_CONTACT_PRESET_CASES,
	URL_CONTACT_TRAITS_NOTE,
	type UrlContactDocSection,
} from "./contact-preset-cases";
import {
	URL_PREFILL_DOC_SECTIONS,
	URL_PREFILL_PRESET_CASES,
	type UrlPrefillDocSection,
} from "./preset-cases";
import {
	newPrefillParamRow,
	PrefillParamRows,
	rowsToParamEntries,
	type PrefillParamRow,
} from "./prefill-param-rows";

const STORAGE_BASE_URL = "encatch_shareable_prefill_base_url";
const STORAGE_ACTIVE_TAB = "encatch_shareable_prefill_active_tab";
const STORAGE_DOC_SOURCE = "encatch_shareable_prefill_doc_source";
const STORAGE_CUSTOM_ROWS = "encatch_shareable_prefill_custom_rows";
const STORAGE_URL_OVERRIDES = "encatch_shareable_prefill_url_overrides";
const STORAGE_CUSTOM_URL_OVERRIDE = "encatch_shareable_prefill_custom_url_override";

type DocSource = "advanced" | "contact";

type ShareableUrlPresetCase = {
	id: string;
	name: string;
	description: string;
	docAnchor: string;
	params: import("@/lib/shareable-url-params").ParamEntry[];
	uiChecklist: string[];
	irChecklist: string[];
};

type ActiveTab = UrlPrefillDocSection | UrlContactDocSection | "custom";

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

function loadUrlOverrides(): Record<string, string> {
	try {
		const raw = getStored(STORAGE_URL_OVERRIDES);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, string>;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function loadCustomRows(): PrefillParamRow[] {
	try {
		const raw = getStored(STORAGE_CUSTOM_ROWS);
		if (!raw) return [newPrefillParamRow()];
		const parsed = JSON.parse(raw) as Partial<PrefillParamRow>[];
		if (!Array.isArray(parsed) || parsed.length === 0) return [newPrefillParamRow()];
		return parsed.map((row) => ({
			...newPrefillParamRow(),
			...row,
			contactField: row.contactField ?? "id",
		}));
	} catch {
		return [newPrefillParamRow()];
	}
}

function buildCaseUrl(baseUrl: string, preset: ShareableUrlPresetCase): string {
	if (!baseUrl.trim()) return "";
	if (preset.params.length === 0) return baseUrl.trim();
	try {
		return appendParams(baseUrl.trim(), preset.params);
	} catch {
		return "";
	}
}

function PresetCaseCard({
	preset,
	baseUrl,
	urlOverride,
	onUrlOverrideChange,
}: {
	preset: ShareableUrlPresetCase;
	baseUrl: string;
	urlOverride: string | undefined;
	onUrlOverrideChange: (presetId: string, value: string | undefined) => void;
}) {
	const [copied, setCopied] = useState(false);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const presetUrl = useMemo(() => buildCaseUrl(baseUrl, preset), [baseUrl, preset]);
	const url = urlOverride ?? presetUrl;
	const isOverridden = urlOverride !== undefined && urlOverride !== presetUrl;

	const startEditing = () => {
		setDraft(url);
		setEditing(true);
	};

	const finishEditing = () => {
		const trimmed = draft.trim();
		if (!trimmed || trimmed === presetUrl) {
			onUrlOverrideChange(preset.id, undefined);
		} else {
			onUrlOverrideChange(preset.id, trimmed);
		}
		setEditing(false);
	};

	const copyUrl = async () => {
		if (!url) {
			toast.error("Set a shareable base URL first");
			return;
		}
		await navigator.clipboard.writeText(url);
		setCopied(true);
		toast.success("URL copied");
		setTimeout(() => setCopied(false), 2000);
	};

	const openUrl = () => {
		if (!url) {
			toast.error("Set a shareable base URL first");
			return;
		}
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const resetUrl = () => {
		onUrlOverrideChange(preset.id, undefined);
		setEditing(false);
	};

	return (
		<Card className="border-border/80">
			<CardHeader className="pb-2">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<CardTitle className="text-base">
							<Badge variant="outline" className="mr-2 font-mono">
								{preset.id}
							</Badge>
							{preset.name}
						</CardTitle>
						{preset.description ? (
							<CardDescription className="mt-1">{preset.description}</CardDescription>
						) : null}
					</div>
					<a
						href={preset.docAnchor}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-primary hover:underline"
					>
						Doc section
					</a>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor={`preset-url-${preset.id}`} className="text-xs text-muted-foreground">
							URL {isOverridden ? "(edited)" : "(from preset)"}
						</Label>
						<div className="flex gap-1">
							{isOverridden ? (
								<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetUrl}>
									<RotateCcw className="mr-1 h-3 w-3" />
									Reset
								</Button>
							) : null}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() => (editing ? finishEditing() : startEditing())}
							>
								<Pencil className="mr-1 h-3 w-3" />
								{editing ? "Done" : "Edit"}
							</Button>
						</div>
					</div>
					{editing ? (
						<Input
							id={`preset-url-${preset.id}`}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="https://form.dev.encatch.com/s/…?contact_id=…"
							className="font-mono text-xs"
						/>
					) : (
						<div className="rounded-md bg-muted/50 p-2">
							<Text className="break-all font-mono text-xs text-muted-foreground">{url || "— set base URL —"}</Text>
						</div>
					)}
				</div>

				<div className="grid gap-3 md:grid-cols-2">
					<div>
						<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							UI checklist
						</Text>
						<ul className="space-y-1 text-sm">
							{preset.uiChecklist.map((item) => (
								<li key={item} className="flex gap-2">
									<span className="text-muted-foreground">☐</span>
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>
					<div>
						<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Individual Responses (manual)
						</Text>
						<ul className="space-y-1 text-sm">
							{preset.irChecklist.map((item) => (
								<li key={item} className="flex gap-2">
									<span className="text-muted-foreground">☐</span>
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onClick={copyUrl} disabled={!url}>
						{copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
						Copy URL
					</Button>
					<Button type="button" size="sm" onClick={openUrl} disabled={!url}>
						<ExternalLink className="mr-1 h-4 w-4" />
						Open in new tab
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export default function ShareablePrefillTestPage() {
	const [baseUrl, setBaseUrl] = useState(() => getStored(STORAGE_BASE_URL));
	const [docSource, setDocSource] = useState<DocSource>(() => {
		const stored = getStored(STORAGE_DOC_SOURCE);
		return stored === "contact" ? "contact" : "advanced";
	});
	const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
		const stored = getStored(STORAGE_ACTIVE_TAB);
		if (stored === "custom") return "custom";
		if (URL_PREFILL_DOC_SECTIONS.some((s) => s.key === stored)) {
			return stored as UrlPrefillDocSection;
		}
		if (URL_CONTACT_DOC_SECTIONS.some((s) => s.key === stored)) {
			return stored as UrlContactDocSection;
		}
		return "A";
	});
	const [customRows, setCustomRows] = useState<PrefillParamRow[]>(() => loadCustomRows());
	const [urlOverrides, setUrlOverrides] = useState<Record<string, string>>(() => loadUrlOverrides());
	const [customUrlOverride, setCustomUrlOverride] = useState<string | undefined>(() => {
		const stored = getStored(STORAGE_CUSTOM_URL_OVERRIDE);
		return stored || undefined;
	});
	const [customUrlEditing, setCustomUrlEditing] = useState(false);
	const [customUrlDraft, setCustomUrlDraft] = useState("");

	const docSections = docSource === "advanced" ? URL_PREFILL_DOC_SECTIONS : URL_CONTACT_DOC_SECTIONS;
	const presetCases = docSource === "advanced" ? URL_PREFILL_PRESET_CASES : URL_CONTACT_PRESET_CASES;

	useEffect(() => {
		setStored(STORAGE_BASE_URL, baseUrl);
	}, [baseUrl]);

	useEffect(() => {
		setStored(STORAGE_DOC_SOURCE, docSource);
	}, [docSource]);

	useEffect(() => {
		setStored(STORAGE_ACTIVE_TAB, activeTab);
	}, [activeTab]);

	useEffect(() => {
		setStored(STORAGE_CUSTOM_ROWS, JSON.stringify(customRows));
	}, [customRows]);

	useEffect(() => {
		setStored(STORAGE_URL_OVERRIDES, JSON.stringify(urlOverrides));
	}, [urlOverrides]);

	useEffect(() => {
		if (customUrlOverride) {
			setStored(STORAGE_CUSTOM_URL_OVERRIDE, customUrlOverride);
		} else {
			try {
				localStorage.removeItem(STORAGE_CUSTOM_URL_OVERRIDE);
			} catch {
				// ignore
			}
		}
	}, [customUrlOverride]);

	const setPresetUrlOverride = useCallback((presetId: string, value: string | undefined) => {
		setUrlOverrides((prev) => {
			if (value === undefined) {
				const next = { ...prev };
				delete next[presetId];
				return next;
			}
			return { ...prev, [presetId]: value };
		});
	}, []);

	const customUrl = useMemo(() => {
		if (!baseUrl.trim()) return "";
		const entries = rowsToParamEntries(customRows);
		if (entries.length === 0) return baseUrl.trim();
		try {
			return appendParams(baseUrl.trim(), entries);
		} catch {
			return "";
		}
	}, [baseUrl, customRows]);

	const effectiveCustomUrl = customUrlOverride ?? customUrl;
	const customUrlIsOverridden = customUrlOverride !== undefined && customUrlOverride !== customUrl;

	const startCustomUrlEditing = () => {
		setCustomUrlDraft(effectiveCustomUrl);
		setCustomUrlEditing(true);
	};

	const finishCustomUrlEditing = () => {
		const trimmed = customUrlDraft.trim();
		if (!trimmed || trimmed === customUrl) {
			setCustomUrlOverride(undefined);
		} else {
			setCustomUrlOverride(trimmed);
		}
		setCustomUrlEditing(false);
	};

	const copyCustomUrl = useCallback(async () => {
		if (!effectiveCustomUrl) {
			toast.error("Set base URL and at least one param row");
			return;
		}
		await navigator.clipboard.writeText(effectiveCustomUrl);
		toast.success("Custom URL copied");
	}, [effectiveCustomUrl]);

	return (
		<div className="space-y-6 pb-10" data-testid="shareable-prefill-test-page">
			<div className="flex items-center gap-2">
				<Icon icon="solar:link-round-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Shareable URL Test</h2>
					<Text variant="body2" className="text-muted-foreground">
					Test <code className="rounded bg-muted px-1">response_</code>,{" "}
					<code className="rounded bg-muted px-1">context_</code>, and{" "}
					<code className="rounded bg-muted px-1">contact_</code> query parameters for{" "}
					<strong>{URL_PREFILL_FORM_TITLE}</strong> per{" "}
					<a
						href="https://dev.encatch.com/docs/shareable-feedback/advanced-configuration"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						Advanced Configuration
					</a>{" "}
					and{" "}
					<a
						href="https://dev.encatch.com/docs/shareable-feedback/user-identification"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						User Identification
					</a>
					. Individual Responses and contact verification are manual. {URL_PREFILL_CONTEXT_WELCOME_NOTE}
					{docSource === "contact" ? ` ${URL_CONTACT_TRAITS_NOTE}` : ""}{" "}
					For signed links, use{" "}
					<Link to="/encatch-hmac-generator" className="text-primary hover:underline">
						Encatch HMAC Generator
					</Link>
					.
					</Text>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Documentation</CardTitle>
					<CardDescription>Switch preset cases between Advanced Configuration and User Identification.</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs
						value={docSource}
						onValueChange={(v) => {
							const next = v as DocSource;
							setDocSource(next);
							setActiveTab(next === "advanced" ? "A" : "J");
						}}
					>
						<TabsList>
							<TabsTrigger value="advanced">Advanced Configuration (A–I)</TabsTrigger>
							<TabsTrigger value="contact">User Identification (J–P)</TabsTrigger>
						</TabsList>
					</Tabs>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Shareable base URL</CardTitle>
					<CardDescription>
						Paste the active <code>/s/</code> link from admin Share tab ({URL_PREFILL_FORM_TITLE}). Saved in
						localStorage.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-1.5">
						<Label htmlFor="shareable-base-url">Base URL</Label>
						<Input
							id="shareable-base-url"
							value={baseUrl}
							onChange={(e) => setBaseUrl(e.target.value)}
							placeholder="https://form.dev.encatch.com/s/your-link-id"
							className="font-mono text-sm"
						/>
					</div>
				</CardContent>
			</Card>

			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
				<TabsList className="flex h-auto flex-wrap justify-start gap-1">
					{docSections.map((section) => (
						<TabsTrigger key={section.key} value={section.key} className="text-xs">
							{section.key}: {section.label}
						</TabsTrigger>
					))}
					<TabsTrigger value="custom" className="text-xs">
						Custom builder
					</TabsTrigger>
				</TabsList>

				{docSections.map((section) => (
					<TabsContent key={section.key} value={section.key} className="mt-4 space-y-3">
						<Text className="text-sm text-muted-foreground">
							{presetCases.filter((c) => c.section === section.key).length} preset case(s) — section{" "}
							{section.key}: {section.label}
						</Text>
						{presetCases
							.filter((c) => c.section === section.key)
							.map((preset) => (
								<PresetCaseCard
									key={preset.id}
									preset={preset}
									baseUrl={baseUrl}
									urlOverride={urlOverrides[preset.id]}
									onUrlOverrideChange={setPresetUrlOverride}
								/>
							))}
					</TabsContent>
				))}

				<TabsContent value="custom" className="mt-4 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Custom parameter builder</CardTitle>
							<CardDescription>
								Build arbitrary <code>response_</code>, <code>context_</code>, or <code>contact_</code>{" "}
								links. Uses <code>URLSearchParams</code> encoding per the docs.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<PrefillParamRows rows={customRows} onChange={setCustomRows} />
							<div className="space-y-1.5">
								<div className="flex items-center justify-between gap-2">
									<Label htmlFor="custom-built-url" className="text-xs text-muted-foreground">
										URL {customUrlIsOverridden ? "(edited)" : "(from builder)"}
									</Label>
									<div className="flex gap-1">
										{customUrlIsOverridden ? (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-7 px-2 text-xs"
												onClick={() => {
													setCustomUrlOverride(undefined);
													setCustomUrlEditing(false);
												}}
											>
												<RotateCcw className="mr-1 h-3 w-3" />
												Reset
											</Button>
										) : null}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-xs"
											onClick={() => (customUrlEditing ? finishCustomUrlEditing() : startCustomUrlEditing())}
										>
											<Pencil className="mr-1 h-3 w-3" />
											{customUrlEditing ? "Done" : "Edit"}
										</Button>
									</div>
								</div>
								{customUrlEditing ? (
									<Input
										id="custom-built-url"
										value={customUrlDraft}
										onChange={(e) => setCustomUrlDraft(e.target.value)}
										placeholder="https://form.dev.encatch.com/s/…"
										className="font-mono text-xs"
									/>
								) : (
									<div className="rounded-md bg-muted/50 p-2">
										<Text className="break-all font-mono text-xs">{effectiveCustomUrl || "—"}</Text>
									</div>
								)}
							</div>
							<div className="flex gap-2">
								<Button type="button" variant="outline" size="sm" onClick={copyCustomUrl} disabled={!effectiveCustomUrl}>
									<Copy className="mr-1 h-4 w-4" />
									Copy URL
								</Button>
								<Button
									type="button"
									size="sm"
									disabled={!effectiveCustomUrl}
									onClick={() => window.open(effectiveCustomUrl, "_blank", "noopener,noreferrer")}
								>
									<ExternalLink className="mr-1 h-4 w-4" />
									Open in new tab
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
