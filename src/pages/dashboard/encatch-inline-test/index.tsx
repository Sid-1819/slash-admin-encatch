import { Icon } from "@/components/icon";
import {
	ENCATCH_DEFAULT_HOST,
	ENCATCH_HOST_OPTIONS,
	ENCATCH_STORAGE_KEYS,
	type EncatchSavedApiKeyEntry,
	formatEncatchApiKeyPreview,
	formatEncatchSavedApiKeyLabel,
	getEncatchApiKeyForHost,
	getEncatchFeedbackFormId1,
	getEncatchFeedbackFormId2,
	getEncatchHostLabel,
	getEncatchInitOrigin,
	getEncatchSavedApiKeyEntries,
	initEncatch,
	setEncatchApiKeyForHost,
	_encatch,
} from "@/lib/encatch";
import { cn } from "@/utils/index";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text } from "@/ui/typography";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type MountMode = "none" | "any" | "specific";
type FormIdSource = "primary" | "mismatch";
type PreviewPlacement = "modal" | "feedback-slot" | "encatch";

type ScenarioSetup = {
	mountMode: MountMode;
	bindFormId?: boolean;
	useCallSelector: boolean;
	callSelector?: string;
	formIdSource: FormIdSource;
};

type ScenarioPreview = {
	placement: PreviewPlacement;
	encatchInDom: boolean;
	feedbackSlotInDom: boolean;
	encatchBound: boolean;
	selectorLabel?: string;
};

type InlineScenario = {
	id: string;
	title: string;
	description: string;
	expected: string;
	accentClass: string;
	setup: ScenarioSetup;
	preview: ScenarioPreview;
};

const DEFAULT_CALL_SELECTOR = "#feedback-slot";
const MISMATCH_FORM_ID = "__encatch-mismatch-test__";

const INLINE_TEST_STORAGE_KEYS = {
	FORM_UUID: "encatch_inline_test_form_uuid",
	FORM_SLUG: "encatch_inline_test_form_slug",
	IDENTIFIER_MODE: "encatch_inline_test_identifier_mode",
	MISMATCH_ID: "encatch_inline_test_mismatch_id",
} as const;

type FormIdentifierMode = "uuid" | "slug";

function getInlineTestStored(key: string): string {
	try {
		return localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

function loadInitialFormUuid(): string {
	const stored = getInlineTestStored(INLINE_TEST_STORAGE_KEYS.FORM_UUID).trim();
	if (stored) return stored;
	return getEncatchFeedbackFormId1();
}

function loadInitialFormSlug(): string {
	return getInlineTestStored(INLINE_TEST_STORAGE_KEYS.FORM_SLUG).trim();
}

function loadInitialIdentifierMode(): FormIdentifierMode {
	const stored = getInlineTestStored(INLINE_TEST_STORAGE_KEYS.IDENTIFIER_MODE);
	return stored === "slug" ? "slug" : "uuid";
}

const INLINE_SCENARIOS: InlineScenario[] = [
	{
		id: "modal-no-mount",
		title: "Modal — no #encatch",
		description: "No mount div in the DOM. Default behavior when your page has no inline host.",
		expected: "Form opens as a centered modal with a dimmed full-page overlay. Left box stays empty.",
		accentClass: "border-l-amber-500",
		setup: { mountMode: "none", useCallSelector: false, formIdSource: "primary" },
		preview: { placement: "modal", encatchInDom: false, feedbackSlotInDom: false, encatchBound: false },
	},
	{
		id: "inline-any",
		title: 'Inline — <div id="encatch">',
		description: "Unbound #encatch host. Any form passed to showForm() renders inline.",
		expected: "Form renders inside the green #encatch zone. No full-page overlay.",
		accentClass: "border-l-emerald-500",
		setup: { mountMode: "any", useCallSelector: false, formIdSource: "primary" },
		preview: { placement: "encatch", encatchInDom: true, feedbackSlotInDom: false, encatchBound: false },
	},
	{
		id: "inline-bound-match",
		title: "Inline — bound form ID matches",
		description: "data-encatch-form-id equals the ID you pass to showForm().",
		expected: "Form renders in the green #encatch zone (bound ID matches).",
		accentClass: "border-l-blue-500",
		setup: { mountMode: "specific", bindFormId: true, useCallSelector: false, formIdSource: "primary" },
		preview: { placement: "encatch", encatchInDom: true, feedbackSlotInDom: false, encatchBound: true },
	},
	{
		id: "inline-bound-mismatch",
		title: "Inline — bound form ID mismatch",
		description: "Host is bound to your chosen identifier, but showForm() is called with a different ID (e.g. slug vs UUID).",
		expected: "Form opens as modal (amber overlay). #encatch zone stays empty — slug and UUID do not cross-resolve.",
		accentClass: "border-l-orange-500",
		setup: { mountMode: "specific", bindFormId: true, useCallSelector: false, formIdSource: "mismatch" },
		preview: { placement: "modal", encatchInDom: true, feedbackSlotInDom: false, encatchBound: true },
	},
	{
		id: "selector-explicit",
		title: "Call-time selector — #feedback-slot",
		description: "showForm(id, { selector: '#feedback-slot' }). Highest priority placement.",
		expected: "Form renders in the purple #feedback-slot zone (not #encatch).",
		accentClass: "border-l-violet-500",
		setup: {
			mountMode: "any",
			useCallSelector: true,
			callSelector: DEFAULT_CALL_SELECTOR,
			formIdSource: "primary",
		},
		preview: {
			placement: "feedback-slot",
			encatchInDom: true,
			feedbackSlotInDom: true,
			encatchBound: false,
			selectorLabel: DEFAULT_CALL_SELECTOR,
		},
	},
	{
		id: "selector-fallback",
		title: "Call-time selector miss → #encatch fallback",
		description: "Selector does not match any element. Falls back to #encatch rules.",
		expected: "Form renders in the green #encatch zone. Selector zone shows as missed.",
		accentClass: "border-l-cyan-500",
		setup: {
			mountMode: "any",
			useCallSelector: true,
			callSelector: "#non-existent-slot",
			formIdSource: "primary",
		},
		preview: {
			placement: "encatch",
			encatchInDom: true,
			feedbackSlotInDom: false,
			encatchBound: false,
			selectorLabel: "#non-existent-slot",
		},
	},
];

function hasMountedFormContent(element: HTMLElement | null): boolean {
	if (!element) return false;
	return element.querySelector("iframe") != null || element.childElementCount > 0;
}

function detectFormPlacement(): PreviewPlacement | null {
	if (hasMountedFormContent(document.getElementById("feedback-slot"))) return "feedback-slot";
	if (hasMountedFormContent(document.getElementById("encatch"))) return "encatch";
	return "modal";
}

function placementLabel(placement: PreviewPlacement): string {
	if (placement === "modal") return "Modal overlay";
	if (placement === "feedback-slot") return "Inline → #feedback-slot";
	return "Inline → #encatch";
}

function PreviewZone({
	label,
	subtitle,
	inDom,
	isTarget,
	isDetected,
	children,
	targetColorClass,
}: {
	label: string;
	subtitle?: string;
	inDom: boolean;
	isTarget: boolean;
	isDetected: boolean;
	children?: React.ReactNode;
	targetColorClass: string;
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col rounded-lg border-2 transition-all duration-300",
				!inDom && "border-dashed border-muted-foreground/25 bg-muted/10 opacity-50",
				inDom && !isTarget && !isDetected && "border-border bg-background",
				inDom && isTarget && !isDetected && cn("shadow-md", targetColorClass),
				isDetected && "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-md",
			)}
		>
			<div className="flex items-center justify-between gap-2 border-b border-border/60 px-2.5 py-1.5">
				<div className="min-w-0">
					<p className="truncate font-mono text-[11px] font-semibold">{label}</p>
					{subtitle && <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>}
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<Badge variant={inDom ? "secondary" : "outline"} className="text-[9px] px-1.5 py-0">
						{inDom ? "IN DOM" : "NOT IN DOM"}
					</Badge>
					{isTarget && <Badge className="bg-primary text-[9px] px-1.5 py-0">EXPECTED HERE</Badge>}
					{isDetected && <Badge className="bg-emerald-600 text-[9px] px-1.5 py-0">FORM MOUNTED</Badge>}
				</div>
			</div>
			<div className="relative min-h-[120px] flex-1 p-2">
				{children}
				{!inDom && (
					<div className="absolute inset-0 flex items-center justify-center">
						<Text variant="caption" className="text-muted-foreground/70 line-through">
							Element absent
						</Text>
					</div>
				)}
				{inDom && isTarget && !isDetected && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="flex flex-col items-center gap-1 text-center">
							<Icon icon="solar:arrow-down-bold" size={20} className="text-primary animate-bounce" />
							<Text variant="caption" className="font-medium text-primary">
								Form should appear here
							</Text>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function InlineMountPreview({
	scenario,
	mountKey,
	mountMode,
	boundFormId,
	feedbackSlotInDom,
	lastRunFormId,
	detectedPlacement,
	onDismiss,
}: {
	scenario: InlineScenario | undefined;
	mountKey: number;
	mountMode: MountMode;
	boundFormId: string;
	feedbackSlotInDom: boolean;
	lastRunFormId: string | null;
	detectedPlacement: PreviewPlacement | null;
	onDismiss: () => void;
}) {
	const preview = scenario?.preview;
	const expectedPlacement = preview?.placement ?? null;
	const placementMatch = expectedPlacement != null && detectedPlacement != null && expectedPlacement === detectedPlacement;

	return (
		<aside
			className={cn(
				"sticky top-4 flex flex-col gap-3 rounded-xl border-2 border-dashed bg-muted/20 p-4",
				scenario?.accentClass ?? "border-l-muted-foreground/30",
				"border-l-4",
			)}
		>
			<div className="space-y-2">
				<div className="flex items-start justify-between gap-2">
					<div>
						<Text className="text-sm font-semibold">Live preview</Text>
						<Text variant="caption" className="text-muted-foreground">
							{scenario ? scenario.title : "Run a scenario to start"}
						</Text>
					</div>
					{expectedPlacement && (
						<Badge variant={expectedPlacement === "modal" ? "outline" : "default"} className="shrink-0 text-[10px]">
							{expectedPlacement === "modal" ? "MODAL" : "INLINE"}
						</Badge>
					)}
				</div>

				{expectedPlacement && (
					<div
						className={cn(
							"rounded-md border px-2.5 py-2 text-[11px]",
							placementMatch
								? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
								: detectedPlacement
									? "border-destructive/40 bg-destructive/10 text-destructive"
									: "border-border bg-muted/40 text-muted-foreground",
						)}
					>
						<p>
							<span className="font-medium">Expected:</span> {placementLabel(expectedPlacement)}
						</p>
						{detectedPlacement && (
							<p className="mt-0.5">
								<span className="font-medium">Detected:</span> {placementLabel(detectedPlacement)}
								{placementMatch ? " ✓" : " ✗ mismatch"}
							</p>
						)}
						{lastRunFormId && <p className="mt-1 truncate font-mono text-[10px] opacity-80">showForm("{lastRunFormId}")</p>}
					</div>
				)}
			</div>

			{/* Simulated page */}
			<div className="relative overflow-hidden rounded-lg border border-border bg-background shadow-sm">
				<div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-1.5">
					<span className="size-2 rounded-full bg-red-400/80" />
					<span className="size-2 rounded-full bg-amber-400/80" />
					<span className="size-2 rounded-full bg-emerald-400/80" />
					<Text variant="caption" className="ml-1 text-muted-foreground">
						Your page
					</Text>
				</div>

				<div className="relative flex flex-col gap-2 p-2.5 min-h-[440px]">
					{/* Modal overlay simulation */}
					{(expectedPlacement === "modal" || detectedPlacement === "modal") && (
						<div
							className={cn(
								"pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 transition-opacity",
								expectedPlacement === "modal" ? "opacity-100" : "opacity-60",
							)}
						>
							<div
								className={cn(
									"mx-4 w-full max-w-[200px] rounded-lg border-2 bg-background p-4 shadow-xl",
									expectedPlacement === "modal" && detectedPlacement === "modal"
										? "border-emerald-500 ring-2 ring-emerald-500/30"
										: expectedPlacement === "modal"
											? "border-amber-400"
											: "border-border",
								)}
							>
								<div className="mb-2 flex items-center justify-between gap-1">
									<Badge variant="outline" className="text-[9px]">
										MODAL
									</Badge>
									{detectedPlacement === "modal" && <Badge className="bg-emerald-600 text-[9px]">FORM MOUNTED</Badge>}
								</div>
								<div className="space-y-1.5">
									<div className="h-2 w-3/4 rounded bg-muted" />
									<div className="h-2 w-full rounded bg-muted" />
									<div className="h-2 w-5/6 rounded bg-muted" />
									<div className="mt-2 h-6 w-16 rounded bg-primary/20" />
								</div>
								{expectedPlacement === "modal" && detectedPlacement !== "modal" && (
									<Text variant="caption" className="mt-2 block text-center text-amber-600 dark:text-amber-400">
										Waiting for form…
									</Text>
								)}
							</div>
						</div>
					)}

					{/* Selector miss callout */}
					{preview?.selectorLabel && preview.selectorLabel !== DEFAULT_CALL_SELECTOR && (
						<div className="rounded-md border border-dashed border-orange-400/50 bg-orange-500/5 px-2 py-1.5 text-[10px] text-orange-700 dark:text-orange-300">
							Selector <code className="font-mono">{preview.selectorLabel}</code> — not found, falling back
						</div>
					)}

					{/* #feedback-slot zone */}
					<PreviewZone
						label="#feedback-slot"
						subtitle={
							preview?.selectorLabel === DEFAULT_CALL_SELECTOR
								? "Call-time selector target"
								: feedbackSlotInDom
									? "Call-time selector target"
									: "Not used in this scenario"
						}
						inDom={feedbackSlotInDom}
						isTarget={expectedPlacement === "feedback-slot"}
						isDetected={detectedPlacement === "feedback-slot"}
						targetColorClass="border-violet-500 bg-violet-500/5"
					>
						{feedbackSlotInDom && <div id="feedback-slot" className="h-full min-h-[100px] rounded-md bg-violet-500/5" />}
					</PreviewZone>

					{/* #encatch zone */}
					<PreviewZone
						label="#encatch"
						subtitle={
							preview?.encatchBound && boundFormId
								? `data-encatch-form-id="${boundFormId}"`
								: mountMode === "any"
									? "Unbound — any form"
									: mountMode === "specific"
										? "Bound host"
										: "Not in DOM"
						}
						inDom={mountMode !== "none"}
						isTarget={expectedPlacement === "encatch"}
						isDetected={detectedPlacement === "encatch"}
						targetColorClass="border-emerald-500 bg-emerald-500/5"
					>
						{mountMode !== "none" && (
							<div
								key={mountKey}
								id="encatch"
								{...(mountMode === "specific" && boundFormId ? { "data-encatch-form-id": boundFormId } : {})}
								className="h-full min-h-[140px] rounded-md bg-emerald-500/5"
							/>
						)}
					</PreviewZone>
				</div>
			</div>

			{/* Legend */}
			<div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<span className="size-3 rounded border-2 border-primary bg-primary/10" />
					Expected target
				</div>
				<div className="flex items-center gap-1.5">
					<span className="size-3 rounded border-2 border-emerald-500 bg-emerald-500/10" />
					Form detected
				</div>
				<div className="flex items-center gap-1.5">
					<span className="size-3 rounded border-2 border-dashed border-muted-foreground/40 opacity-50" />
					Not in DOM
				</div>
				<div className="flex items-center gap-1.5">
					<span className="size-3 rounded bg-black/40" />
					Modal overlay
				</div>
			</div>

			<Button variant="outline" size="sm" className="w-full" onClick={onDismiss}>
				Dismiss form
			</Button>
		</aside>
	);
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

export default function EncatchInlineTestPage() {
	const [formUuid, setFormUuid] = useState(loadInitialFormUuid);
	const [formSlug, setFormSlug] = useState(loadInitialFormSlug);
	const [identifierMode, setIdentifierMode] = useState<FormIdentifierMode>(loadInitialIdentifierMode);
	const [mismatchId, setMismatchId] = useState(() => getInlineTestStored(INLINE_TEST_STORAGE_KEYS.MISMATCH_ID));
	const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
	const [mountMode, setMountMode] = useState<MountMode>("any");
	const [boundFormId, setBoundFormId] = useState("");
	const [lastAction, setLastAction] = useState<string | null>(null);
	const [lastRunFormId, setLastRunFormId] = useState<string | null>(null);
	const [detectedPlacement, setDetectedPlacement] = useState<PreviewPlacement | null>(null);
	const [mountKey, setMountKey] = useState(0);
	const [encatchApiKey, setEncatchApiKey] = useState("");
	const [encatchHost, setEncatchHost] = useState(ENCATCH_DEFAULT_HOST);
	const [savedApiKeyEntries, setSavedApiKeyEntries] = useState<EncatchSavedApiKeyEntry[]>([]);
	const [initResult, setInitResult] = useState<string | null>(null);

	const dismissForm = useCallback(() => {
		try {
			_encatch.dismissForm();
			setDetectedPlacement(null);
			setLastAction("dismissForm()");
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			setLastAction(`Error: ${message}`);
			toast.error(message);
		}
	}, []);

	const schedulePlacementDetection = useCallback(() => {
		const check = () => setDetectedPlacement(detectFormPlacement());
		window.setTimeout(check, 400);
		window.setTimeout(check, 1200);
		window.setTimeout(check, 2500);
	}, []);

	const resolvePrimaryIdentifier = useCallback((): string | null => {
		const uuid = formUuid.trim();
		const slug = formSlug.trim();
		if (identifierMode === "slug") return slug || null;
		return uuid || null;
	}, [formSlug, formUuid, identifierMode]);

	const resolveMismatchIdentifier = useCallback((): string => {
		const uuid = formUuid.trim();
		const slug = formSlug.trim();
		const override = mismatchId.trim();

		if (override) return override;

		// Classic slug ↔ UUID mismatch when both are set for the same form.
		if (uuid && slug) {
			return identifierMode === "slug" ? uuid : slug;
		}

		const secondary = getEncatchFeedbackFormId2().trim();
		if (secondary) return secondary;

		return MISMATCH_FORM_ID;
	}, [formSlug, formUuid, identifierMode, mismatchId]);

	const resolveFormIdForScenario = useCallback(
		(source: FormIdSource): string | null => {
			const primary = resolvePrimaryIdentifier();
			if (!primary) return null;
			if (source === "primary") return primary;
			return resolveMismatchIdentifier();
		},
		[resolveMismatchIdentifier, resolvePrimaryIdentifier],
	);

	const applyScenarioSetup = useCallback(
		(setup: ScenarioSetup) => {
			setMountMode(setup.mountMode);
			setBoundFormId(setup.bindFormId ? (resolvePrimaryIdentifier() ?? "") : "");
			setMountKey((k) => k + 1);
		},
		[resolvePrimaryIdentifier],
	);

	const runScenario = useCallback(
		(scenario: InlineScenario) => {
			const targetFormId = resolveFormIdForScenario(scenario.setup.formIdSource);
			if (!targetFormId) {
				toast.error(identifierMode === "slug" ? "Enter a Form Slug (or switch to UUID mode)" : "Enter a Form UUID (or switch to Slug mode)");
				return;
			}
			if (scenario.setup.formIdSource === "mismatch") {
				const uuid = formUuid.trim();
				const slug = formSlug.trim();
				if (uuid && slug && !mismatchId.trim()) {
					toast.message(`Mismatch test: bound to ${identifierMode === "slug" ? "slug" : "UUID"}, showForm uses the other identifier.`);
				} else if (!mismatchId.trim()) {
					toast.message("No mismatch ID set — using a fake ID for the mismatch test.");
				}
			}

			try {
				_encatch.dismissForm();
			} catch {
				// ignore
			}

			applyScenarioSetup(scenario.setup);
			setActiveScenarioId(scenario.id);
			setLastRunFormId(targetFormId);
			setDetectedPlacement(null);

			const selector = scenario.setup.useCallSelector ? (scenario.setup.callSelector ?? DEFAULT_CALL_SELECTOR).trim() : undefined;
			const scenarioId = scenario.id;
			const scenarioTitle = scenario.title;

			// Wait for React to commit the mount DOM before showForm reads it.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					try {
						_encatch.showForm(targetFormId, {
							reset: "always",
							...(selector ? { selector } : {}),
						});
						setLastAction(
							selector ? `[${scenarioId}] showForm("${targetFormId}", { selector: "${selector}" })` : `[${scenarioId}] showForm("${targetFormId}")`,
						);
						schedulePlacementDetection();
						toast.success(`Running: ${scenarioTitle}`);
					} catch (e) {
						const message = e instanceof Error ? e.message : String(e);
						setLastAction(`Error: ${message}`);
						toast.error(message);
					}
				});
			});
		},
		[applyScenarioSetup, formSlug, formUuid, identifierMode, mismatchId, resolveFormIdForScenario, schedulePlacementDetection],
	);

	useEffect(() => {
		const unsubscribe = _encatch.on((eventType, payload) => {
			setLastAction(`${eventType}${payload.formId ? ` (${payload.formId})` : ""}`);
			if (eventType === "form:show") {
				schedulePlacementDetection();
			}
			if (eventType === "form:close" || eventType === "form:dismissed") {
				setDetectedPlacement(null);
			}
		});
		return () => unsubscribe();
	}, [schedulePlacementDetection]);

	useEffect(() => {
		try {
			const storedHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.HOST)?.trim() ?? "";
			const host = storedHost || ENCATCH_DEFAULT_HOST;
			setEncatchHost(host);
			setEncatchApiKey(getEncatchApiKeyForHost(host));
			setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
			if (_encatch._initialized) {
				const initHost = getEncatchInitOrigin();
				setInitResult(`SDK initialized with host ${getEncatchHostLabel(initHost)} (${initHost}).`);
			}
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(INLINE_TEST_STORAGE_KEYS.FORM_UUID, formUuid);
			localStorage.setItem(INLINE_TEST_STORAGE_KEYS.FORM_SLUG, formSlug);
			localStorage.setItem(INLINE_TEST_STORAGE_KEYS.IDENTIFIER_MODE, identifierMode);
			localStorage.setItem(INLINE_TEST_STORAGE_KEYS.MISMATCH_ID, mismatchId);
			// Keep legacy keys in sync for Encatch Test page.
			localStorage.setItem(ENCATCH_STORAGE_KEYS.FEEDBACK_FORM_ID_1, formUuid);
			if (mismatchId.trim()) {
				localStorage.setItem(ENCATCH_STORAGE_KEYS.FEEDBACK_FORM_ID_2, mismatchId);
			}
		} catch {
			// ignore
		}
	}, [formUuid, formSlug, identifierMode, mismatchId]);

	const handleEncatchHostChange = (newHost: string) => {
		if (encatchApiKey.trim()) {
			setEncatchApiKeyForHost(encatchHost, encatchApiKey);
		}
		setEncatchHost(newHost);
		setEncatchApiKey(getEncatchApiKeyForHost(newHost));
		setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
	};

	const handleSavedApiKeySelect = (host: string) => {
		const entry = savedApiKeyEntries.find((item) => item.host === host);
		if (!entry) return;
		setEncatchHost(entry.host);
		setEncatchApiKey(entry.apiKey);
		setEncatchApiKeyForHost(entry.host, entry.apiKey);
	};

	const saveEncatchConfig = () => {
		try {
			setEncatchApiKeyForHost(encatchHost, encatchApiKey.trim());
			setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
			toast.success(`Encatch config saved for ${getEncatchHostLabel(encatchHost)}. Click Initialize SDK or reload to apply.`);
		} catch {
			toast.error("Failed to save Encatch config.");
		}
	};

	const handleInitializeSdk = () => {
		setInitResult(null);
		try {
			const key = encatchApiKey.trim();
			setEncatchApiKeyForHost(encatchHost, key);
			setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
			const result = initEncatch();
			if (result.status === "initialized") {
				setInitResult(`SDK initialized with host ${result.hostLabel} (${result.host}).`);
				toast.success(`SDK initialized with ${result.hostLabel}.`);
			} else if (result.status === "already_initialized") {
				setInitResult(`SDK already initialized with host ${result.hostLabel} (${result.host}). Reload the page to use a new API key or host.`);
				toast.message(`Already initialized with ${result.hostLabel}.`);
			} else {
				setInitResult(result.message);
				toast.error(result.message);
			}
		} catch (e) {
			setInitResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
			toast.error("Failed to initialize SDK.");
		}
	};

	const activeScenario = INLINE_SCENARIOS.find((s) => s.id === activeScenarioId);
	const feedbackSlotInDom = activeScenario?.preview.feedbackSlotInDom ?? false;
	const primaryIdentifier = resolvePrimaryIdentifier();
	const showFormPreview = primaryIdentifier ? `_encatch.showForm('${primaryIdentifier}')` : "_encatch.showForm('…')";

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:sidebar-minimalistic-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch Inline Form</h2>
					<Text variant="body2" className="text-muted-foreground">
						Enter your form ID, pick a scenario, and click Run. Each scenario configures the mount and calls showForm for you.
					</Text>
				</div>
			</div>

			<Section title="Encatch config" description="Pick an environment, enter its API key, then save or initialize.">
				<div className="flex flex-col gap-5">
					{initResult && (
						<div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
							<Text variant="caption" className="font-medium text-foreground">
								{initResult}
							</Text>
						</div>
					)}

					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="encatch-host">Environment</Label>
							<Select value={encatchHost} onValueChange={handleEncatchHostChange}>
								<SelectTrigger id="encatch-host" className="w-full">
									<SelectValue placeholder="Select environment" />
								</SelectTrigger>
								<SelectContent>
									{ENCATCH_HOST_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="encatch-api-key">API key</Label>
							<Input
								id="encatch-api-key"
								type="text"
								placeholder={`Key for ${getEncatchHostLabel(encatchHost)}`}
								value={encatchApiKey}
								onChange={(e) => setEncatchApiKey(e.target.value)}
								autoComplete="off"
								className="w-full font-mono text-xs"
							/>
						</div>
					</div>

					{savedApiKeyEntries.length > 0 && (
						<div className="flex flex-col gap-2">
							<Label className="text-xs text-muted-foreground">Saved configurations</Label>
							<div className="flex flex-wrap gap-2">
								{savedApiKeyEntries.map((entry) => {
									const isActive = entry.host === encatchHost && entry.apiKey === encatchApiKey;
									return (
										<Button
											key={entry.host}
											type="button"
											variant={isActive ? "default" : "outline"}
											size="sm"
											className="h-auto min-w-40 flex-col items-start gap-0.5 px-3 py-2 text-left font-normal"
											onClick={() => handleSavedApiKeySelect(entry.host)}
											title={formatEncatchSavedApiKeyLabel(entry)}
										>
											<span className="text-xs font-medium">{entry.hostLabel}</span>
											<span className={`font-mono text-[10px] ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
												{formatEncatchApiKeyPreview(entry.apiKey)}
											</span>
										</Button>
									);
								})}
							</div>
						</div>
					)}

					<div className="flex flex-wrap gap-2 border-t border-border pt-4">
						<Button type="button" variant="outline" size="sm" onClick={saveEncatchConfig}>
							Save config
						</Button>
						<Button type="button" size="sm" onClick={handleInitializeSdk}>
							Initialize SDK
						</Button>
					</div>
				</div>
			</Section>

			<Section
				title="Form identifier"
				description="Encatch accepts either the Feedback Configuration UUID or the Form Slug in showForm(). Pick which one scenarios should pass."
			>
				<div className="flex flex-col gap-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="form-uuid">Feedback Configuration UUID</Label>
							<Input
								id="form-uuid"
								value={formUuid}
								onChange={(e) => setFormUuid(e.target.value)}
								placeholder="f67e1722-f7ab-4928-a5d9-f78cfcd777f1"
								className="font-mono text-sm"
							/>
							<Text variant="caption" className="text-muted-foreground">
								From Encatch admin → Manual Trigger → Feedback Configuration UUID
							</Text>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="form-slug">Form Slug</Label>
							<Input
								id="form-slug"
								value={formSlug}
								onChange={(e) => setFormSlug(e.target.value)}
								placeholder="beta-product-feedback-slug"
								className="font-mono text-sm"
							/>
							<Text variant="caption" className="text-muted-foreground">
								From Encatch admin → Manual Trigger → Form Slug
							</Text>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="identifier-mode">Pass to showForm()</Label>
							<Select value={identifierMode} onValueChange={(value) => setIdentifierMode(value as FormIdentifierMode)}>
								<SelectTrigger id="identifier-mode">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="uuid">UUID</SelectItem>
									<SelectItem value="slug">Slug</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="mismatch-id">Mismatch ID (optional)</Label>
							<Input
								id="mismatch-id"
								value={mismatchId}
								onChange={(e) => setMismatchId(e.target.value)}
								placeholder="Override for bound mismatch scenario"
								className="font-mono text-sm"
							/>
							<Text variant="caption" className="text-muted-foreground">
								Leave empty to auto-use the other identifier (slug ↔ UUID) when both are set
							</Text>
						</div>
					</div>

					<div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 font-mono text-xs text-muted-foreground">
						<span className="font-medium text-foreground">Usage: </span>
						{showFormPreview}
					</div>
				</div>
			</Section>

			<div className="grid gap-6 lg:grid-cols-[minmax(340px,400px)_1fr]">
				<InlineMountPreview
					scenario={activeScenario}
					mountKey={mountKey}
					mountMode={mountMode}
					boundFormId={boundFormId}
					feedbackSlotInDom={feedbackSlotInDom}
					lastRunFormId={lastRunFormId}
					detectedPlacement={detectedPlacement}
					onDismiss={dismissForm}
				/>

				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2">
						<Text className="text-sm font-semibold">Test scenarios</Text>
						<Text variant="caption" className="text-muted-foreground">
							Click Run on each scenario in order
						</Text>
					</div>

					{INLINE_SCENARIOS.map((scenario) => {
						const isActive = activeScenarioId === scenario.id;
						const expected = scenario.preview.placement;
						return (
							<Card
								key={scenario.id}
								className={cn("border-l-4 transition-colors", scenario.accentClass, isActive ? "border-primary/30 bg-primary/5" : "border-l-transparent")}
							>
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between gap-3">
										<div className="flex flex-col gap-1">
											<div className="flex flex-wrap items-center gap-2">
												<CardTitle className="text-sm font-semibold">{scenario.title}</CardTitle>
												<Badge variant={expected === "modal" ? "outline" : "secondary"} className="text-[10px]">
													{expected === "modal" ? "→ Modal" : expected === "feedback-slot" ? "→ #feedback-slot" : "→ #encatch"}
												</Badge>
											</div>
											<CardDescription className="text-xs">{scenario.description}</CardDescription>
										</div>
										{isActive && <Badge>Active</Badge>}
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-3 pt-0">
									<div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
										<span className="font-medium text-foreground">Expected: </span>
										{scenario.expected}
									</div>
									<Button size="sm" className="w-fit" onClick={() => runScenario(scenario)}>
										Run scenario
									</Button>
								</CardContent>
							</Card>
						);
					})}

					{lastAction && (
						<Text variant="caption" className="text-muted-foreground">
							Last SDK event: {lastAction}
						</Text>
					)}
				</div>
			</div>
		</div>
	);
}
