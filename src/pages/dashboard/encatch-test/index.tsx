import { Icon } from "@/components/icon";
import {
	ENCATCH_CUSTOM_DOMAIN_LABEL,
	ENCATCH_DEFAULT_HOST,
	ENCATCH_HOST_OPTIONS,
	ENCATCH_STORAGE_KEYS,
	ENCATCH_TEST_STORAGE_KEYS,
	type EncatchSavedApiKeyEntry,
	formatEncatchApiKeyPreview,
	getEncatchApiBaseUrl,
	getEncatchApiBaseUrlOverride,
	getEncatchApiKeyForHost,
	getEncatchFeedbackFormId1,
	getEncatchFeedbackFormId2,
	getEncatchHostLabel,
	getEncatchInitOrigin,
	getEncatchSavedApiKeyEntries,
	encatchPauseSession,
	encatchResumeSession,
	encatchStopSession,
	initEncatch,
	isEncatchPresetHost,
	_encatch,
	mapTraitsToSdk,
	normalizeEncatchHostUrl,
	setEncatchApiBaseUrlForHost,
	setEncatchApiKeyForHost,
} from "@/lib/encatch";
import {
	BROWSER_OPTIONS,
	DEFAULT_DEVICE_INFO_TEST_VALUES,
	DEVICE_OS_OPTIONS,
	DEVICE_TYPE_OPTIONS,
	generateRandomDeviceInfoTestValues,
	loadDeviceInfoTestValues,
	saveDeviceInfoTestValues,
	type DeviceInfoTestValues,
} from "@/lib/device-info";
import {
	type AddToResponsePrefillRow,
	newAddToResponsePrefillRow,
	parseAddToResponsePrefillRows,
	parseAddToResponseValue,
	serializeAddToResponsePrefillRows,
} from "@/lib/add-to-response-types";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text } from "@/ui/typography";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type EncatchNetworkLogEntry,
} from "@/lib/encatch-network-monitor";

import { AddToResponsePrefillRows } from "./add-to-response-prefill-rows";

type ResetMode = "always" | "on-complete" | "never";
type EncatchTheme = "light" | "dark" | "system";

const ENCATCH_THEME_OPTIONS: EncatchTheme[] = ["light", "dark", "system"];

function parseStoredTheme(raw: string): EncatchTheme {
	return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

type KeyValue = { key: string; value: string };
type KeyValueRow = KeyValue & { id: string };

function Section({
	title,
	description,
	icon,
	children,
}: {
	title: string;
	description?: string;
	icon?: string;
	children: React.ReactNode;
}) {
	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b border-border/40 bg-muted/20 pb-3">
				<div className="flex items-start gap-2">
					{icon && <Icon icon={icon} size={18} className="mt-0.5 text-primary shrink-0" />}
					<div>
						<CardTitle className="text-sm font-semibold">{title}</CardTitle>
						{description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-4">{children}</CardContent>
		</Card>
	);
}

interface EventLogEntry {
	eventType: string;
	payload: { formId?: string; timestamp: number; data?: Record<string, unknown> };
	at: string;
}

/** Matches core-backend ApiValidationUseCase: HMAC-SHA256(userName) or HMAC-SHA256(userName + epochMs). */
async function generateHMACSignature(userId: string, secretKey: string, datetimeUTC?: string): Promise<string> {
	const message = datetimeUTC ? `${userId}${datetimeUTC}` : userId;
	const enc = new TextEncoder();
	const keyBytes = enc.encode(secretKey);
	const messageBytes = enc.encode(message);
	const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes);
	const hex = Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hex;
}

function getTestStored(key: string): string {
	if (typeof window === "undefined" || typeof localStorage === "undefined") return "";
	try {
		return localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

function setTestStored(key: string, value: string): void {
	try {
		if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
	} catch {
		// ignore
	}
}

function generateRandomUser(): { username: string; email: string; displayName: string } {
	const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
	return {
		username: `user_${id}`,
		email: `user_${id}@example.com`,
		displayName: `Test User ${id.slice(0, 6)}`,
	};
}

/** Parse addToResponse value: JSON literals (numbers, booleans, null, arrays, objects, quoted strings) become native values; otherwise the trimmed text is used as a string. */
function parseEncatchPrefillValue(raw: string): unknown {
	const trimmed = raw.trim();
	const text = trimmed || raw;
	if (text === "") return "";
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function parseKeyValueRowsFromJson(raw: string): KeyValueRow[] {
	if (!raw.trim()) return [];
	const arr = JSON.parse(raw) as unknown;
	if (!Array.isArray(arr)) return [];
	return arr
		.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
		.map((x) => ({
			key: typeof x.key === "string" ? x.key : "",
			value: typeof x.value === "string" ? x.value : "",
			id: crypto.randomUUID(),
		}));
}

function loadShowFormContextRowsFromStorage(): KeyValueRow[] {
	try {
		return parseKeyValueRowsFromJson(getTestStored(ENCATCH_TEST_STORAGE_KEYS.SHOW_FORM_CONTEXT_ROWS));
	} catch {
		return [];
	}
}

const DEFAULT_SOURCE_TRACKING_ROWS: KeyValue[] = [
	{ key: "utm_source", value: "slash-admin" },
	{ key: "utm_campaign", value: "test_campaign" },
	{ key: "utm_medium", value: "manual" },
];

function loadSourceTrackingRowsFromStorage(): KeyValueRow[] {
	try {
		const rows = parseKeyValueRowsFromJson(getTestStored(ENCATCH_TEST_STORAGE_KEYS.SOURCE_TRACKING_ROWS));
		if (rows.length > 0) return rows;
	} catch {
		// fall through
	}
	return DEFAULT_SOURCE_TRACKING_ROWS.map((row) => ({ ...row, id: crypto.randomUUID() }));
}

function loadPrefillRowsFromStorage(): AddToResponsePrefillRow[] {
	try {
		const fromRows = parseAddToResponsePrefillRows(getTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_ROWS));
		if (fromRows.length > 0) return fromRows;
		const legacyId = getTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_QUESTION_ID);
		const legacyValue = getTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_VALUE);
		if (legacyId.trim() || legacyValue.trim()) {
			return [{ ...newAddToResponsePrefillRow(legacyId, "short_answer"), value: legacyValue }];
		}
	} catch {
		// fall through
	}
	return [newAddToResponsePrefillRow()];
}

/** Build showForm context: only string | number | boolean (SDK ContextValue minus Date). */
function buildShowFormContext(rows: KeyValueRow[]): {
	context: Record<string, string | number | boolean> | undefined;
	skippedKeys: string[];
} {
	const out: Record<string, string | number | boolean> = {};
	const skippedKeys: string[] = [];
	for (const { key, value } of rows) {
		const k = key.trim();
		if (!k) continue;
		const parsed = parseEncatchPrefillValue(value);
		if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") {
			out[k] = parsed;
		} else {
			skippedKeys.push(k);
		}
	}
	return {
		context: Object.keys(out).length > 0 ? out : undefined,
		skippedKeys,
	};
}

function ResultMessage({ message }: { message: string | null }) {
	if (!message) return null;
	const isError = message.toLowerCase().startsWith("error");
	return (
		<div className={`mt-2 rounded-md px-3 py-2 text-xs font-medium ${isError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
			{message}
		</div>
	);
}

export default function EncatchTestPage() {
	// trackEvent
	const [trackEventName, setTrackEventName] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.TRACK_EVENT_NAME) || "test_event");
	const [trackResult, setTrackResult] = useState<string | null>(null);

	// identifyUser
	const [identifyUserName, setIdentifyUserName] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.IDENTIFY_USERNAME) || "user_123");
	const [identifySetEmail, setIdentifySetEmail] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.IDENTIFY_EMAIL) || "user_123@example.com");
	const [identifySetDisplayName, setIdentifySetDisplayName] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.IDENTIFY_DISPLAY_NAME) || "Test User");
	const [identifySetExtra, setIdentifySetExtra] = useState<KeyValueRow[]>([]);
	const [identifySetOncePairs, setIdentifySetOncePairs] = useState<KeyValueRow[]>([]);
	const [identifyIncrementPairs, setIdentifyIncrementPairs] = useState<KeyValueRow[]>([]);
	const [identifyDecrementPairs, setIdentifyDecrementPairs] = useState<KeyValueRow[]>([]);
	const [identifyUnsetKeys, setIdentifyUnsetKeys] = useState("");
	const [showIdentifyOptions, setShowIdentifyOptions] = useState(false);
	const [identifyLocale, setIdentifyLocale] = useState("");
	const [identifyCountry, setIdentifyCountry] = useState("");
	const [identifySecretKey, setIdentifySecretKey] = useState("");
	const [identifyIncludeDateTime, setIdentifyIncludeDateTime] = useState(false);
	const [identifyResult, setIdentifyResult] = useState<string | null>(null);

	// setTheme / setLocale / setCountry
	const [theme, setTheme] = useState<EncatchTheme>(() => parseStoredTheme(getTestStored(ENCATCH_TEST_STORAGE_KEYS.THEME)));
	const [themeResult, setThemeResult] = useState<string | null>(null);
	const [language, setLanguage] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.LANGUAGE) || "en");
	const [languageResult, setLanguageResult] = useState<string | null>(null);
	const [country, setCountry] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.COUNTRY) || "US");
	const [countryResult, setCountryResult] = useState<string | null>(null);

	// trackScreen
	const [screenName, setScreenName] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.SCREEN_NAME) || "/dashboard/encatch-test");
	const [trackScreenResult, setTrackScreenResult] = useState<string | null>(null);

	// showForm
	const [feedbackFormId1, setFeedbackFormId1] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.FEEDBACK_FORM_ID_1) || getEncatchFeedbackFormId1());
	const [feedbackFormId2, setFeedbackFormId2] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.FEEDBACK_FORM_ID_2) || getEncatchFeedbackFormId2());
	const [resetMode1, setResetMode1] = useState<ResetMode>(() => (getTestStored(ENCATCH_TEST_STORAGE_KEYS.RESET_MODE_1) as ResetMode) || "always");
	const [resetMode2, setResetMode2] = useState<ResetMode>(() => (getTestStored(ENCATCH_TEST_STORAGE_KEYS.RESET_MODE_2) as ResetMode) || "always");
	const [showFormContextRows, setShowFormContextRows] = useState<KeyValueRow[]>(() => loadShowFormContextRowsFromStorage());
	const [sourceTrackingRows, setSourceTrackingRows] = useState<KeyValueRow[]>(() => loadSourceTrackingRowsFromStorage());
	const [sourceTrackingResult, setSourceTrackingResult] = useState<string | null>(null);
	const [showFormResult, setShowFormResult] = useState<string | null>(null);

	// addToResponse
	const [prefillRows, setPrefillRows] = useState<AddToResponsePrefillRow[]>(() => loadPrefillRowsFromStorage());
	const [addToResponseResult, setAddToResponseResult] = useState<string | null>(null);

	// Device info — manual test values only (no UA auto-detect)
	const [deviceType, setDeviceType] = useState(() => loadDeviceInfoTestValues().deviceType);
	const [deviceOs, setDeviceOs] = useState(() => loadDeviceInfoTestValues().deviceOs);
	const [deviceOsVersion, setDeviceOsVersion] = useState(() => loadDeviceInfoTestValues().deviceOsVersion);
	const [browser, setBrowser] = useState(() => loadDeviceInfoTestValues().browser);
	const [browserVersion, setBrowserVersion] = useState(() => loadDeviceInfoTestValues().browserVersion);
	const [deviceInfoResult, setDeviceInfoResult] = useState<string | null>(null);

	// Encatch config (API key + host) — from localStorage, synced with login
	const [encatchApiKey, setEncatchApiKey] = useState("");
	const [encatchHost, setEncatchHost] = useState(ENCATCH_DEFAULT_HOST);
	const [hostMode, setHostMode] = useState<"preset" | "custom">("preset");
	const [customFormHost, setCustomFormHost] = useState("");
	const [customApiBaseUrl, setCustomApiBaseUrl] = useState("");
	const [savedApiKeyEntries, setSavedApiKeyEntries] = useState<EncatchSavedApiKeyEntry[]>(getEncatchSavedApiKeyEntries);
	const [initResult, setInitResult] = useState<string | null>(null);

	// Session / reset
	const [sessionResult, setSessionResult] = useState<string | null>(null);
	const [sessionRecordingResult, setSessionRecordingResult] = useState<string | null>(null);
	const [resetUserResult, setResetUserResult] = useState<string | null>(null);
	const [clearDeviceIdResult, setClearDeviceIdResult] = useState<string | null>(null);

	// Event log (on callback)
	const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
	const eventLogRef = useRef<EventLogEntry[]>([]);
	const [networkLog, setNetworkLog] = useState<EncatchNetworkLogEntry[]>([]);
	const networkLogRef = useRef<EncatchNetworkLogEntry[]>([]);
	const maxLogEntries = 20;

	const appendEvent = useCallback((eventType: string, payload: { formId?: string; timestamp: number; data?: Record<string, unknown> }) => {
		const entry: EventLogEntry = {
			eventType,
			payload,
			at: new Date().toISOString(),
		};
		eventLogRef.current = [entry, ...eventLogRef.current].slice(0, maxLogEntries);
		setEventLog(eventLogRef.current);
	}, []);

	useEffect(() => {
		const unsubscribe = _encatch.on((eventType, payload) => {
			appendEvent(eventType, payload);
		});
		return () => unsubscribe();
	}, [appendEvent]);

	// On-page network log listens to global monitor (installed in main.tsx for DevTools Network).
	useEffect(() => {
		const handler = (event: Event) => {
			const entry = (event as CustomEvent<EncatchNetworkLogEntry>).detail;
			networkLogRef.current = [entry, ...networkLogRef.current].slice(0, maxLogEntries);
			setNetworkLog(networkLogRef.current);
		};
		window.addEventListener("encatch:network", handler);
		return () => window.removeEventListener("encatch:network", handler);
	}, []);

	// Keep fetch patch in sync whenever manual device fields change
	useEffect(() => {
		saveDeviceInfoTestValues({
			deviceType,
			deviceOs,
			deviceOsVersion,
			browser,
			browserVersion,
		});
	}, [deviceType, deviceOs, deviceOsVersion, browser, browserVersion]);

	// Load Encatch config and saved API keys from localStorage on mount
	useEffect(() => {
		try {
			const storedHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.HOST)?.trim() ?? "";
			const host = storedHost || ENCATCH_DEFAULT_HOST;
			const isCustom = !isEncatchPresetHost(host);
			setHostMode(isCustom ? "custom" : "preset");
			setEncatchHost(host);
			if (isCustom) {
				setCustomFormHost(host);
				setCustomApiBaseUrl(getEncatchApiBaseUrlOverride(host) || getEncatchApiBaseUrl(host) || "");
			}
			setEncatchApiKey(getEncatchApiKeyForHost(host));
			setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
			if (_encatch._initialized) {
				const initHost = _encatch._config?.webHost || getEncatchInitOrigin();
				const apiBaseUrl = getEncatchApiBaseUrl(initHost);
				setInitResult(`SDK active → ${getEncatchHostLabel(initHost)} (API: ${apiBaseUrl || initHost})`);
			}
		} catch {
			// ignore
		}
	}, []);

	// Persist test form state to localStorage when values change
	useEffect(() => {
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.IDENTIFY_USERNAME, identifyUserName);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.IDENTIFY_EMAIL, identifySetEmail);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.IDENTIFY_DISPLAY_NAME, identifySetDisplayName);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.TRACK_EVENT_NAME, trackEventName);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.SCREEN_NAME, screenName);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.THEME, theme);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.LANGUAGE, language);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.COUNTRY, country);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.FEEDBACK_FORM_ID_1, feedbackFormId1);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.FEEDBACK_FORM_ID_2, feedbackFormId2);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.RESET_MODE_1, resetMode1);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.RESET_MODE_2, resetMode2);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.SHOW_FORM_CONTEXT_ROWS, JSON.stringify(showFormContextRows.map(({ key, value }) => ({ key, value }))));
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.SOURCE_TRACKING_ROWS, JSON.stringify(sourceTrackingRows.map(({ key, value }) => ({ key, value }))));
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_ROWS, serializeAddToResponsePrefillRows(prefillRows));
	}, [
		identifyUserName,
		identifySetEmail,
		identifySetDisplayName,
		trackEventName,
		screenName,
		theme,
		language,
		country,
		feedbackFormId1,
		feedbackFormId2,
		resetMode1,
		resetMode2,
		showFormContextRows,
		sourceTrackingRows,
		prefillRows,
	]);

	// Build traits object from simple fields (for preview and submit)
	const identifyTraitsFromFields = useCallback((): Record<string, unknown> => {
		const traits: Record<string, unknown> = {};
		const setObj: Record<string, unknown> = {};
		if (identifySetEmail.trim()) setObj.email = identifySetEmail.trim();
		if (identifySetDisplayName.trim()) setObj.display_name = identifySetDisplayName.trim();
		for (const { key, value } of identifySetExtra) {
			if (key.trim()) setObj[key.trim()] = value.trim();
		}
		if (Object.keys(setObj).length > 0) traits.$set = setObj;

		const setOnceObj: Record<string, unknown> = {};
		for (const { key, value } of identifySetOncePairs) {
			if (key.trim()) setOnceObj[key.trim()] = value.trim();
		}
		if (Object.keys(setOnceObj).length > 0) traits.$setOnce = setOnceObj;

		const incObj: Record<string, number> = {};
		for (const { key, value } of identifyIncrementPairs) {
			if (key.trim()) {
				const n = Number(value.trim());
				if (!Number.isNaN(n)) incObj[key.trim()] = n;
			}
		}
		if (Object.keys(incObj).length > 0) traits.$increment = incObj;

		const decObj: Record<string, number> = {};
		for (const { key, value } of identifyDecrementPairs) {
			if (key.trim()) {
				const n = Number(value.trim());
				if (!Number.isNaN(n)) decObj[key.trim()] = n;
			}
		}
		if (Object.keys(decObj).length > 0) traits.$decrement = decObj;

		const unsetArr = identifyUnsetKeys
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (unsetArr.length > 0) traits.$unset = unsetArr;
		return traits;
	}, [identifySetEmail, identifySetDisplayName, identifySetExtra, identifySetOncePairs, identifyIncrementPairs, identifyDecrementPairs, identifyUnsetKeys]);

	const handleTrackEvent = () => {
		setTrackResult(null);
		try {
			_encatch.trackEvent(trackEventName.trim() || "unnamed_event");
			const msg = `trackEvent fired: ${trackEventName.trim() || "unnamed_event"}`;
			setTrackResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setTrackResult(msg);
		}
	};

	const handleIdentify = async () => {
		setIdentifyResult(null);
		try {
			const traits = identifyTraitsFromFields();
			const options: { locale?: string; country?: string; secure?: { signature: string; generatedDateTimeinUTC?: string } } = {};
			if (identifyLocale.trim()) options.locale = identifyLocale.trim();
			if (identifyCountry.trim()) options.country = identifyCountry.trim();
			if (identifySecretKey.trim()) {
				const datetimeUTC = identifyIncludeDateTime ? String(Date.now()) : undefined;
				const signature = await generateHMACSignature(identifyUserName.trim() || "anonymous", identifySecretKey.trim(), datetimeUTC);
				options.secure = {
					signature,
					...(datetimeUTC && { generatedDateTimeinUTC: datetimeUTC }),
				};
			}
			const userName = identifyUserName.trim() || "anonymous";
			_encatch.identifyUser(userName, mapTraitsToSdk(Object.keys(traits).length ? traits : undefined), Object.keys(options).length > 0 ? options : undefined);
			const msg = `identifyUser called for: ${userName}`;
			setIdentifyResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setIdentifyResult(msg);
		}
	};

	function addSetExtra() {
		setIdentifySetExtra((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function addSetOnce() {
		setIdentifySetOncePairs((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function addIncrement() {
		setIdentifyIncrementPairs((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function addDecrement() {
		setIdentifyDecrementPairs((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function updateSetExtra(index: number, field: "key" | "value", val: string) {
		setIdentifySetExtra((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeSetExtra(index: number) {
		setIdentifySetExtra((prev) => prev.filter((_, i) => i !== index));
	}
	function updateSetOnce(index: number, field: "key" | "value", val: string) {
		setIdentifySetOncePairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeSetOnce(index: number) {
		setIdentifySetOncePairs((prev) => prev.filter((_, i) => i !== index));
	}
	function updateIncrement(index: number, field: "key" | "value", val: string) {
		setIdentifyIncrementPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeIncrement(index: number) {
		setIdentifyIncrementPairs((prev) => prev.filter((_, i) => i !== index));
	}
	function updateDecrement(index: number, field: "key" | "value", val: string) {
		setIdentifyDecrementPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeDecrement(index: number) {
		setIdentifyDecrementPairs((prev) => prev.filter((_, i) => i !== index));
	}

	function addShowFormContextRow() {
		setShowFormContextRows((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function updateShowFormContextRow(index: number, field: "key" | "value", val: string) {
		setShowFormContextRows((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeShowFormContextRow(index: number) {
		setShowFormContextRows((prev) => prev.filter((_, i) => i !== index));
	}

	function addSourceTrackingRow() {
		setSourceTrackingRows((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function updateSourceTrackingRow(index: number, field: "key" | "value", val: string) {
		setSourceTrackingRows((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeSourceTrackingRow(index: number) {
		setSourceTrackingRows((prev) => prev.filter((_, i) => i !== index));
	}
	function fillSourceTrackingPreset() {
		setSourceTrackingRows(DEFAULT_SOURCE_TRACKING_ROWS.map((row) => ({ ...row, id: crypto.randomUUID() })));
	}

	function buildSourceTrackingValues(rows: KeyValueRow[]): Record<string, string> | undefined {
		const values: Record<string, string> = {};
		for (const { key, value } of rows) {
			const k = key.trim();
			if (!k) continue;
			values[k] = value;
		}
		return Object.keys(values).length > 0 ? values : undefined;
	}

	function applySourceTrackingFromRows(): Record<string, string> | undefined {
		const values = buildSourceTrackingValues(sourceTrackingRows);
		if (!values) return undefined;
		_encatch.addSourceTracking(values);
		return values;
	}

	const handleAddSourceTracking = () => {
		setSourceTrackingResult(null);
		try {
			const values = applySourceTrackingFromRows();
			if (!values) {
				const msg = "Add at least one key/value pair";
				setSourceTrackingResult(msg);
				return;
			}
			const msg = `addSourceTracking: ${JSON.stringify(values)}`;
			setSourceTrackingResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setSourceTrackingResult(msg);
		}
	};

	const handleSetTheme = () => {
		setThemeResult(null);
		try {
			_encatch.setTheme(theme);
			const msg = `setTheme: ${theme}`;
			setThemeResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setThemeResult(msg);
		}
	};

	const handleSetLocale = () => {
		setLanguageResult(null);
		try {
			_encatch.setLocale(language.trim() || "en");
			const msg = `setLocale: ${language.trim() || "en"}`;
			setLanguageResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setLanguageResult(msg);
		}
	};

	const handleSetCountry = () => {
		setCountryResult(null);
		try {
			_encatch.setCountry(country.trim() || "US");
			const msg = `setCountry: ${country.trim() || "US"}`;
			setCountryResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setCountryResult(msg);
		}
	};

	const handleTrackScreen = () => {
		setTrackScreenResult(null);
		try {
			_encatch.trackScreen(screenName.trim() || window.location.href);
			const msg = `trackScreen: ${screenName.trim() || window.location.href}`;
			setTrackScreenResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setTrackScreenResult(msg);
		}
	};

	const handleStartSession = () => {
		setSessionResult(null);
		try {
			_encatch.startSession();
			const msg = "startSession called (ping + URL tracking enabled)";
			setSessionResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setSessionResult(msg);
		}
	};

	const handlePauseSession = () => {
		setSessionRecordingResult(null);
		try {
			encatchPauseSession();
			const msg = "pauseSession() called";
			setSessionRecordingResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setSessionRecordingResult(msg);
		}
	};

	const handleResumeSession = () => {
		setSessionRecordingResult(null);
		try {
			encatchResumeSession();
			const msg = "resumeSession() called";
			setSessionRecordingResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setSessionRecordingResult(msg);
		}
	};

	const handleStopSession = () => {
		setSessionRecordingResult(null);
		try {
			encatchStopSession();
			const msg = "stopSession() called";
			setSessionRecordingResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setSessionRecordingResult(msg);
		}
	};

	const handleResetUser = () => {
		setResetUserResult(null);
		try {
			_encatch.resetUser();
			const msg = "resetUser called (anonymous; session cleared)";
			setResetUserResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setResetUserResult(msg);
		}
	};

	const ENCATCH_DEVICE_ID_KEY = "encatch_device_id";
	const handleClearDeviceId = () => {
		setClearDeviceIdResult(null);
		try {
			if (typeof localStorage !== "undefined") {
				localStorage.removeItem(ENCATCH_DEVICE_ID_KEY);
				const msg = "encatch_device_id removed. Refresh for a new device ID.";
				setClearDeviceIdResult(msg);
			} else {
				setClearDeviceIdResult("localStorage not available.");
			}
		} catch (e) {
			setClearDeviceIdResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const buildDeviceValuesFromFields = useCallback((): DeviceInfoTestValues => {
		return {
			deviceType: deviceType.trim() || DEFAULT_DEVICE_INFO_TEST_VALUES.deviceType,
			deviceOs: deviceOs.trim() || DEFAULT_DEVICE_INFO_TEST_VALUES.deviceOs,
			deviceOsVersion: deviceOsVersion.trim(),
			browser: browser.trim() || DEFAULT_DEVICE_INFO_TEST_VALUES.browser,
			browserVersion: browserVersion.trim(),
		};
	}, [deviceType, deviceOs, deviceOsVersion, browser, browserVersion]);

	const handleSetDeviceInfo = () => {
		setDeviceInfoResult(null);
		try {
			const values = buildDeviceValuesFromFields();
			saveDeviceInfoTestValues(values);
			const msg = `Device info set: type=${values.deviceType}, OS=${values.deviceOs}, browser=${values.browser}`;
			setDeviceInfoResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setDeviceInfoResult(msg);
		}
	};

	const handleResetDeviceInfoDefaults = () => {
		setDeviceType(DEFAULT_DEVICE_INFO_TEST_VALUES.deviceType);
		setDeviceOs(DEFAULT_DEVICE_INFO_TEST_VALUES.deviceOs);
		setDeviceOsVersion(DEFAULT_DEVICE_INFO_TEST_VALUES.deviceOsVersion);
		setBrowser(DEFAULT_DEVICE_INFO_TEST_VALUES.browser);
		setBrowserVersion(DEFAULT_DEVICE_INFO_TEST_VALUES.browserVersion);
		saveDeviceInfoTestValues(DEFAULT_DEVICE_INFO_TEST_VALUES);
		setDeviceInfoResult("Reset to test defaults (desktop / Windows / Chrome).");
	};

	const handleRandomDeviceInfo = () => {
		const values = generateRandomDeviceInfoTestValues();
		setDeviceType(values.deviceType);
		setDeviceOs(values.deviceOs);
		setDeviceOsVersion(values.deviceOsVersion);
		setBrowser(values.browser);
		setBrowserVersion(values.browserVersion);
		setDeviceInfoResult(null);
	};

	const handlePushDeviceInfo = () => {
		setDeviceInfoResult(null);
		try {
			saveDeviceInfoTestValues(buildDeviceValuesFromFields());
			if (identifyUserName.trim()) {
				void handleIdentify();
				const msg = "Device info saved & identifyUser called";
				setDeviceInfoResult(msg);
			} else {
				_encatch.startSession();
				const msg = "Device info saved & startSession called";
				setDeviceInfoResult(msg);
			}
		} catch (e) {
			setDeviceInfoResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleOpenForm1 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId1.trim() || getEncatchFeedbackFormId1();
			const { context, skippedKeys } = buildShowFormContext(showFormContextRows);
			if (skippedKeys.length > 0) {
				const msg = `Error: showForm context values must be string, number, or boolean. Invalid keys: ${skippedKeys.join(", ")}`;
				setShowFormResult(msg);
				return;
			}
			const sourceTracking = applySourceTrackingFromRows();
			_encatch.showForm(formId, { reset: resetMode1, ...(context ? { context } : {}) });
			const ctxMsg = context ? `, context=${JSON.stringify(context)}` : "";
			const stMsg = sourceTracking ? `, sourceTracking=${JSON.stringify(sourceTracking)}` : "";
			const msg = `showForm: ${formId} (reset=${resetMode1}${ctxMsg}${stMsg})`;
			setShowFormResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setShowFormResult(msg);
		}
	};

	const handleOpenForm2 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId2.trim() || getEncatchFeedbackFormId2();
			const { context, skippedKeys } = buildShowFormContext(showFormContextRows);
			if (skippedKeys.length > 0) {
				const msg = `Error: showForm context values must be string, number, or boolean. Invalid keys: ${skippedKeys.join(", ")}`;
				setShowFormResult(msg);
				return;
			}
			const sourceTracking = applySourceTrackingFromRows();
			_encatch.showForm(formId, { reset: resetMode2, ...(context ? { context } : {}) });
			const ctxMsg = context ? `, context=${JSON.stringify(context)}` : "";
			const stMsg = sourceTracking ? `, sourceTracking=${JSON.stringify(sourceTracking)}` : "";
			const msg = `showForm: ${formId} (reset=${resetMode2}${ctxMsg}${stMsg})`;
			setShowFormResult(msg);
		} catch (e) {
			const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
			setShowFormResult(msg);
		}
	};

	const handleAddToResponse = () => {
		setAddToResponseResult(null);
		const validRows = prefillRows.filter((r) => r.questionId.trim());
		if (validRows.length === 0) {
			setAddToResponseResult("Error: add at least one question ID");
			return;
		}
		const applied: string[] = [];
		const errors: string[] = [];
		for (const row of validRows) {
			const qId = row.questionId.trim();
			try {
				const value = parseAddToResponseValue(row.questionType, row.value);
				_encatch.addToResponse(qId, value);
				applied.push(`${qId} (${row.questionType}) = ${JSON.stringify(value)}`);
			} catch (e) {
				errors.push(`${qId} (${row.questionType}): ${e instanceof Error ? e.message : String(e)}`);
			}
		}
		if (errors.length > 0) {
			const appliedMsg = applied.length > 0 ? ` Added: ${applied.join("; ")}` : "";
			const msg = `Error: ${errors.join("; ")}.${appliedMsg}`;
			setAddToResponseResult(msg);
			return;
		}
		const msg = `addToResponse: ${applied.length} answer${applied.length === 1 ? "" : "s"} staged`;
		setAddToResponseResult(msg);
	};

	const handleRandomUser = () => {
		const { username, email, displayName } = generateRandomUser();
		setIdentifyUserName(username);
		setIdentifySetEmail(email);
		setIdentifySetDisplayName(displayName);
	};

	const persistCurrentEncatchConfig = () => {
		if (hostMode === "custom") {
			const normalizedHost = normalizeEncatchHostUrl(customFormHost);
			if (!normalizedHost) {
				throw new Error("Enter a valid custom form host (e.g. feedback.example.com).");
			}
			const normalizedApi = customApiBaseUrl.trim() ? normalizeEncatchHostUrl(customApiBaseUrl) : null;
			if (customApiBaseUrl.trim() && !normalizedApi) {
				throw new Error("Enter a valid custom API base URL or leave it blank to use the form host.");
			}
			setCustomFormHost(normalizedHost);
			setEncatchHost(normalizedHost);
			setEncatchApiBaseUrlForHost(normalizedHost, normalizedApi ?? "");
			if (encatchApiKey.trim()) {
				setEncatchApiKeyForHost(normalizedHost, encatchApiKey.trim());
			}
			return normalizedHost;
		}
		if (encatchApiKey.trim()) {
			setEncatchApiKeyForHost(encatchHost, encatchApiKey.trim());
		}
		return encatchHost;
	};

	const handleSavedApiKeySelect = (host: string) => {
		try {
			persistCurrentEncatchConfig();
		} catch {
			// Best effort before switching hosts.
		}
		const isCustom = !isEncatchPresetHost(host);
		setHostMode(isCustom ? "custom" : "preset");
		setEncatchHost(host);
		if (isCustom) {
			setCustomFormHost(host);
			setCustomApiBaseUrl(getEncatchApiBaseUrlOverride(host) || getEncatchApiBaseUrl(host) || "");
		}
		setEncatchApiKey(getEncatchApiKeyForHost(host));
		refreshSavedApiKeyEntries();
	};

	const handlePresetHostSelect = (host: string) => {
		try {
			persistCurrentEncatchConfig();
		} catch {
			// Best effort before switching hosts.
		}
		setHostMode("preset");
		setEncatchHost(host);
		setEncatchApiKey(getEncatchApiKeyForHost(host));
		refreshSavedApiKeyEntries();
	};

	const handleCustomDomainSelect = () => {
		try {
			persistCurrentEncatchConfig();
		} catch {
			// Best effort before switching hosts.
		}
		setHostMode("custom");
		const normalizedHost = normalizeEncatchHostUrl(customFormHost);
		if (normalizedHost) {
			setEncatchHost(normalizedHost);
			setEncatchApiKey(getEncatchApiKeyForHost(normalizedHost));
		}
		refreshSavedApiKeyEntries();
	};

	const refreshSavedApiKeyEntries = () => {
		setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
	};

	const handleInitializeSdk = () => {
		setInitResult(null);
		try {
			const activeHost = persistCurrentEncatchConfig();
			const key = encatchApiKey.trim();
			setEncatchApiKeyForHost(activeHost, key);
			refreshSavedApiKeyEntries();
			// Force reinit if host or key changed from what SDK currently uses
			const currentSdkHost = _encatch._initialized ? _encatch._config?.webHost : undefined;
			const currentSdkKey = _encatch._apiKey;
			const needsForce = _encatch._initialized && (currentSdkHost !== activeHost || currentSdkKey !== key);
			const result = initEncatch(needsForce);
			if (result.status === "initialized") {
				const apiBaseUrl = getEncatchApiBaseUrl(result.host);
				setInitResult(`SDK initialized → ${result.hostLabel} (API: ${apiBaseUrl || result.host})`);
			} else if (result.status === "already_initialized") {
				const apiBaseUrl = getEncatchApiBaseUrl(result.host);
				setInitResult(`SDK active → ${result.hostLabel} (API: ${apiBaseUrl || result.host})`);
			} else {
				setInitResult(result.message);
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setInitResult(`Error: ${msg}`);
		}
	};

	/** Clear localStorage, sessionStorage, and IndexedDB but keep Encatch API key, host, and API keys list. */
	const handleClearAllExceptApiKey = async () => {
		try {
			let savedApiKey: string | null = null;
			let savedHost: string | null = null;
			let savedApiKeysByHost: string | null = null;
			let savedApiBaseUrlByHost: string | null = null;
			let savedApiKeysList: string | null = null;
			if (typeof localStorage !== "undefined") {
				savedApiKey = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEY);
				savedHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.HOST);
				savedApiKeysByHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEYS_BY_HOST);
				savedApiBaseUrlByHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_BASE_URL_BY_HOST);
				savedApiKeysList = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEYS_LIST);
				localStorage.clear();
				if (savedApiKey != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, savedApiKey);
				if (savedHost != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.HOST, savedHost);
				if (savedApiKeysByHost != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEYS_BY_HOST, savedApiKeysByHost);
				if (savedApiBaseUrlByHost != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_BASE_URL_BY_HOST, savedApiBaseUrlByHost);
				if (savedApiKeysList != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEYS_LIST, savedApiKeysList);
			}
			if (typeof sessionStorage !== "undefined") sessionStorage.clear();
			if (typeof indexedDB !== "undefined") {
				const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name: string }[]> };
				if (typeof idb.databases === "function") {
					const dbs = await idb.databases();
					for (const db of dbs) {
						if (db.name) indexedDB.deleteDatabase(db.name);
					}
				}
			}
			// Reset form state but keep API key, host, and saved keys list
			const host = savedHost?.trim() || ENCATCH_DEFAULT_HOST;
			const isCustom = !isEncatchPresetHost(host);
			setHostMode(isCustom ? "custom" : "preset");
			setEncatchHost(host);
			if (isCustom) {
				setCustomFormHost(host);
				setCustomApiBaseUrl(getEncatchApiBaseUrlOverride(host) || getEncatchApiBaseUrl(host) || "");
			}
			setEncatchApiKey(getEncatchApiKeyForHost(host));
			setIdentifyUserName("user_123");
			setIdentifySetEmail("user_123@example.com");
			setIdentifySetDisplayName("Test User");
			setTrackEventName("test_event");
			setScreenName("/dashboard/encatch-test");
			setTheme("system");
			setLanguage("en");
			setCountry("US");
			setFeedbackFormId1("");
			setFeedbackFormId2("");
			setResetMode1("always");
			setResetMode2("always");
			setShowFormContextRows([]);
			setSourceTrackingRows(DEFAULT_SOURCE_TRACKING_ROWS.map((row) => ({ ...row, id: crypto.randomUUID() })));
			setPrefillRows([newAddToResponsePrefillRow()]);
			refreshSavedApiKeyEntries();
		} catch {
		}
	};

	const handleClearAllExceptApiKeyAndReload = async () => {
		await handleClearAllExceptApiKey();
		window.location.reload();
	};

	/** Clear ALL client-side storage (localStorage, sessionStorage, cookies, IndexedDB) and reload. */
	const handleCleanAll = async () => {
		try {
			if (typeof localStorage !== "undefined") localStorage.clear();
			if (typeof sessionStorage !== "undefined") sessionStorage.clear();
			// Clear cookies (non-HttpOnly only)
			const cookies = document.cookie.split("; ");
			for (const cookie of cookies) {
				const eq = cookie.indexOf("=");
				const name = eq > -1 ? cookie.slice(0, eq).trim() : cookie.trim();
				if (name) {
					document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
					document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
				}
			}
			// Clear IndexedDB
			if (typeof indexedDB !== "undefined") {
				const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name: string }[]> };
				if (typeof idb.databases === "function") {
					const dbs = await idb.databases();
					for (const db of dbs) {
						if (db.name) indexedDB.deleteDatabase(db.name);
					}
				}
			}
			window.location.reload();
		} catch {
		}
	};

	return (
		<div className="flex flex-col gap-6 pb-8">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="solar:bug-minimalistic-bold-duotone" size={22} className="text-primary" />
					</div>
					<div>
						<h2 className="text-xl font-bold tracking-tight">Encatch SDK Test</h2>
						<Text variant="body2" className="text-muted-foreground text-xs">
							Test all @encatch/web-sdk methods. Ensure Encatch is initialized first.
						</Text>
					</div>
				</div>
				<Badge variant={_encatch._initialized ? "success" : "warning"} className="shrink-0">
					{_encatch._initialized ? `Connected: ${getEncatchHostLabel(_encatch._config?.webHost)}` : "Not Initialized"}
				</Badge>
			</div>

			{/* Encatch config */}
			<Section
				title="Encatch config"
				description="API keys are auto-saved per environment. Pick dev / uat / prod, or configure a custom domain."
				icon="solar:settings-bold-duotone"
			>
				<div className="flex flex-col gap-5">
					<ResultMessage message={initResult} />

					{_encatch._initialized && (
						<div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success-dark dark:text-success-light">
							<Icon icon="solar:link-bold" size={14} />
							<span>
								API: <code className="font-mono">{getEncatchApiBaseUrl(_encatch._config?.webHost || "") || _encatch._config?.webHost}</code>
							</span>
						</div>
					)}

					{/* Environment cards */}
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{ENCATCH_HOST_OPTIONS.map((opt) => {
							const entry = savedApiKeyEntries.find((e) => e.host === opt.value);
							const savedKey = entry?.apiKey || "";
							const isSelected = hostMode === "preset" && opt.value === encatchHost;
							const isConnected = _encatch._initialized && _encatch._config?.webHost === opt.value;
							return (
								<button
									key={opt.value}
									type="button"
									onClick={() => handlePresetHostSelect(opt.value)}
									className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all ${
										isConnected ? "border-success bg-success/5" : isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
									}`}
								>
									{isConnected && (
										<span className="absolute top-2 right-2">
											<span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
										</span>
									)}
									<span className="text-xs font-semibold">{opt.label}</span>
									{savedKey ? (
										<span className="font-mono text-[10px] text-muted-foreground truncate w-full">{formatEncatchApiKeyPreview(savedKey)}</span>
									) : (
										<span className="text-[10px] text-muted-foreground/60 italic">No API key</span>
									)}
								</button>
							);
						})}
						<button
							type="button"
							onClick={handleCustomDomainSelect}
							className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all ${
								hostMode === "custom" && _encatch._initialized && !isEncatchPresetHost(_encatch._config?.webHost || "")
									? "border-success bg-success/5"
									: hostMode === "custom"
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50"
							}`}
						>
							{hostMode === "custom" && _encatch._initialized && !isEncatchPresetHost(_encatch._config?.webHost || "") && (
								<span className="absolute top-2 right-2">
									<span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
								</span>
							)}
							<span className="text-xs font-semibold">{ENCATCH_CUSTOM_DOMAIN_LABEL}</span>
							{hostMode === "custom" && customFormHost.trim() ? (
								<span className="font-mono text-[10px] text-muted-foreground truncate w-full">{getEncatchHostLabel(customFormHost)}</span>
							) : (
								<span className="text-[10px] text-muted-foreground/60 italic">Your own form host</span>
							)}
						</button>
					</div>

					{hostMode === "custom" && (
						<div className="grid gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 md:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="encatch-custom-form-host" className="text-xs">
									Form host (webHost)
								</Label>
								<Input
									id="encatch-custom-form-host"
									type="text"
									placeholder="https://feedback.example.com"
									value={customFormHost}
									onChange={(e) => setCustomFormHost(e.target.value)}
									autoComplete="off"
									className="font-mono text-xs"
								/>
								<Text variant="caption" className="text-muted-foreground">
									SDK script and form iframe load from this origin.
								</Text>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="encatch-custom-api-base-url" className="text-xs">
									API base URL (optional)
								</Label>
								<Input
									id="encatch-custom-api-base-url"
									type="text"
									placeholder="https://api.example.com"
									value={customApiBaseUrl}
									onChange={(e) => setCustomApiBaseUrl(e.target.value)}
									autoComplete="off"
									className="font-mono text-xs"
								/>
								<Text variant="caption" className="text-muted-foreground">
									Leave blank to use the form host as the API origin.
								</Text>
							</div>
						</div>
					)}

					{savedApiKeyEntries.some((entry) => !isEncatchPresetHost(entry.host)) && (
						<div className="flex flex-col gap-2">
							<Label className="text-xs text-muted-foreground">Saved custom domains</Label>
							<div className="flex flex-wrap gap-2">
								{savedApiKeyEntries
									.filter((entry) => !isEncatchPresetHost(entry.host))
									.map((entry) => {
										const isActive = entry.host === encatchHost && hostMode === "custom";
										return (
											<Button
												key={entry.host}
												type="button"
												variant={isActive ? "default" : "outline"}
												size="sm"
												className="h-auto min-w-40 flex-col items-start gap-0.5 px-3 py-2 text-left font-normal"
												onClick={() => handleSavedApiKeySelect(entry.host)}
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

					{/* API key input for selected env */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="encatch-api-key" className="text-xs">
							API key for{" "}
							<span className="font-semibold text-primary">{getEncatchHostLabel(hostMode === "custom" ? customFormHost || encatchHost : encatchHost)}</span>
						</Label>
						<div className="flex gap-2">
							<Input
								id="encatch-api-key"
								type="text"
								placeholder={`Paste API key for ${getEncatchHostLabel(encatchHost)}`}
								value={encatchApiKey}
								onChange={(e) => {
									setEncatchApiKey(e.target.value);
									if (e.target.value.trim()) {
										try {
											const activeHost = hostMode === "custom" ? normalizeEncatchHostUrl(customFormHost) || encatchHost : encatchHost;
											if (activeHost) {
												setEncatchApiKeyForHost(activeHost, e.target.value.trim());
												refreshSavedApiKeyEntries();
											}
										} catch {
											// ignore
										}
									}
								}}
								onBlur={() => {
									if (encatchApiKey.trim()) {
										try {
											const activeHost = persistCurrentEncatchConfig();
											setEncatchApiKeyForHost(activeHost, encatchApiKey.trim());
											refreshSavedApiKeyEntries();
										} catch (e) {
										}
									}
								}}
								autoComplete="off"
								className="flex-1 font-mono text-xs"
							/>
							<Button type="button" size="sm" onClick={handleInitializeSdk}>
								Initialize
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap gap-2 border-t border-border pt-4">
						<Button type="button" size="sm" onClick={() => handleClearAllExceptApiKeyAndReload()}>
							Clear storage (keep keys) & reload
						</Button>
						<Button type="button" variant="secondary" size="sm" onClick={() => handleCleanAll()}>
							Clean all (including cookies)
						</Button>
					</div>
				</div>
			</Section>

			{/* Encatch API network log (fetch + XHR) */}
			<Section
				title="Network (Encatch API)"
				description="Same requests appear in browser DevTools → Network. In local dev, filter by engage-product (proxied via localhost)."
				icon="solar:global-bold-duotone"
			>
				<div className="flex flex-col gap-2">
					{networkLog.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-6 text-center">
							<Icon icon="solar:wi-fi-router-minimalistic-bold-duotone" size={32} className="text-muted-foreground/40 mb-2" />
							<Text variant="caption" className="text-muted-foreground">
								No Encatch API requests yet. Initialize the SDK, then fire trackEvent / identifyUser / showForm.
							</Text>
						</div>
					) : (
						<div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/20 divide-y divide-border/50">
							{networkLog.map((entry, i) => (
								<div key={`${entry.at}-${entry.url}-${i}`} className="flex items-start gap-3 px-3 py-2.5">
									<div
										className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${entry.status >= 200 && entry.status < 300 ? "bg-green-500" : entry.status === 0 ? "bg-destructive" : "bg-amber-500"}`}
									/>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<span className="font-mono text-xs font-semibold text-foreground">
												{entry.method} {entry.status || "—"} {entry.statusText}
											</span>
											<span className="text-[10px] text-muted-foreground/60 shrink-0">
												{new Date(entry.at).toLocaleTimeString()}
											</span>
										</div>
										<span className="text-[11px] text-muted-foreground truncate block">{entry.url}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Section>

			{/* Event log from _encatch.on() */}
			<Section title="on (event subscription)" description="Subscribe to form/SDK events. Last events appear below." icon="solar:bell-bold-duotone">
				<div className="flex flex-col gap-2">
					{eventLog.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-6 text-center">
							<Icon icon="solar:inbox-line-bold-duotone" size={32} className="text-muted-foreground/40 mb-2" />
							<Text variant="caption" className="text-muted-foreground">
								No events yet. Open a form or interact to see events.
							</Text>
						</div>
					) : (
						<div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/20 divide-y divide-border/50">
							{eventLog.map((entry, i) => (
								<div key={`${entry.at}-${i}`} className="flex items-start gap-3 px-3 py-2.5">
									<div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<span className="font-mono text-xs font-semibold text-foreground">{entry.eventType}</span>
											<span className="text-[10px] text-muted-foreground/60 shrink-0">{new Date(entry.at).toLocaleTimeString()}</span>
										</div>
										{(entry.payload.formId != null || entry.payload.data != null) && (
											<span className="text-[11px] text-muted-foreground truncate block">
												{entry.payload.formId != null ? `formId: ${entry.payload.formId}` : ""}
												{entry.payload.data != null ? ` | data: ${JSON.stringify(entry.payload.data)}` : ""}
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Section>

			{/* identifyUser & showForm — side by side */}
			<div className="grid gap-4 lg:grid-cols-2 items-start">
				<Section
					title="identifyUser"
					description="Identify the current user. Fill simple fields; generated traits JSON is shown below."
					icon="solar:user-bold-duotone"
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="identify-user-name">User name</Label>
							<div className="flex gap-2">
								<Input
									id="identify-user-name"
									value={identifyUserName}
									onChange={(e) => setIdentifyUserName(e.target.value)}
									placeholder="user_123"
									className="flex-1"
								/>
								<Button type="button" variant="outline" onClick={handleRandomUser} title="Generate random username, email, and display name">
									Random user
								</Button>
							</div>
						</div>

						{/* Traits: simple fields */}
						<div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
							<Text variant="caption" className="font-medium text-foreground">
								Traits
							</Text>
							<div className="grid gap-2 sm:grid-cols-2">
								<div className="flex flex-col gap-1">
									<Label htmlFor="identify-set-email" className="text-xs">
										$set — email
									</Label>
									<Input id="identify-set-email" value={identifySetEmail} onChange={(e) => setIdentifySetEmail(e.target.value)} placeholder="a@b.com" />
								</div>
								<div className="flex flex-col gap-1">
									<Label htmlFor="identify-set-display-name" className="text-xs">
										$set — display_name
									</Label>
									<Input
										id="identify-set-display-name"
										value={identifySetDisplayName}
										onChange={(e) => setIdentifySetDisplayName(e.target.value)}
										placeholder="Test User"
									/>
								</div>
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$set — extra (key / value)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addSetExtra}>
										Add row
									</Button>
								</div>
								{identifySetExtra.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateSetExtra(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input placeholder="value" value={row.value} onChange={(e) => updateSetExtra(i, "value", e.target.value)} className="font-mono text-sm" />
										<Button type="button" variant="ghost" size="sm" onClick={() => removeSetExtra(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$setOnce (key / value)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addSetOnce}>
										Add row
									</Button>
								</div>
								{identifySetOncePairs.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateSetOnce(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input placeholder="value" value={row.value} onChange={(e) => updateSetOnce(i, "value", e.target.value)} className="font-mono text-sm" />
										<Button type="button" variant="ghost" size="sm" onClick={() => removeSetOnce(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$increment (key / number)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addIncrement}>
										Add row
									</Button>
								</div>
								{identifyIncrementPairs.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateIncrement(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input
											type="number"
											placeholder="value"
											value={row.value}
											onChange={(e) => updateIncrement(i, "value", e.target.value)}
											className="font-mono text-sm"
										/>
										<Button type="button" variant="ghost" size="sm" onClick={() => removeIncrement(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$decrement (key / number)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addDecrement}>
										Add row
									</Button>
								</div>
								{identifyDecrementPairs.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateDecrement(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input
											type="number"
											placeholder="value"
											value={row.value}
											onChange={(e) => updateDecrement(i, "value", e.target.value)}
											className="font-mono text-sm"
										/>
										<Button type="button" variant="ghost" size="sm" onClick={() => removeDecrement(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1">
								<Label htmlFor="identify-unset-keys" className="text-xs">
									$unset — keys to remove (comma-separated)
								</Label>
								<Input
									id="identify-unset-keys"
									value={identifyUnsetKeys}
									onChange={(e) => setIdentifyUnsetKeys(e.target.value)}
									placeholder="oldField, otherField"
								/>
							</div>
						</div>

						{/* Generated traits JSON (read-only) */}
						<div className="flex flex-col gap-1.5">
							<Label className="text-muted-foreground text-xs">Generated traits JSON</Label>
							<pre className="min-h-[80px] w-full overflow-auto rounded-md border border-input bg-muted/30 p-3 text-xs font-mono text-muted-foreground">
								{JSON.stringify(identifyTraitsFromFields(), null, 2)}
							</pre>
						</div>

						{/* Options: show/hide */}
						<div className="flex flex-col gap-2">
							<Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShowIdentifyOptions((v) => !v)}>
								{showIdentifyOptions ? "Hide options" : "Show options"}
							</Button>
							{showIdentifyOptions && (
								<div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
									<Text variant="caption" className="font-medium text-foreground">
										Options (locale, country, secure)
									</Text>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="flex flex-col gap-1">
											<Label htmlFor="identify-locale" className="text-xs">
												locale
											</Label>
											<Input id="identify-locale" value={identifyLocale} onChange={(e) => setIdentifyLocale(e.target.value)} placeholder="en" />
										</div>
										<div className="flex flex-col gap-1">
											<Label htmlFor="identify-country" className="text-xs">
												country
											</Label>
											<Input id="identify-country" value={identifyCountry} onChange={(e) => setIdentifyCountry(e.target.value)} placeholder="US" />
										</div>
									</div>
									<div className="flex flex-col gap-1">
										<Label htmlFor="identify-secret-key" className="text-xs">
											Secret Key (optional)
										</Label>
										<Input
											id="identify-secret-key"
											type="password"
											value={identifySecretKey}
											onChange={(e) => setIdentifySecretKey(e.target.value)}
											placeholder="Enter secret key for HMAC signature"
										/>
									</div>
									<label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
										<input
											type="checkbox"
											checked={identifyIncludeDateTime}
											onChange={(e) => setIdentifyIncludeDateTime(e.target.checked)}
											disabled={!identifySecretKey.trim()}
											className="rounded"
										/>
										Include timestamp (ms) in signature — required when your key has a session timeout configured
									</label>
								</div>
							)}
						</div>

						<Button onClick={() => void handleIdentify()}>Identify user</Button>
						<ResultMessage message={identifyResult} />
					</div>
				</Section>

				<div className="flex flex-col gap-4">
					<Section
						title="addSourceTracking"
						description="Merge UTM/campaign params before showForm. Values override URL query params. Also applied automatically when you open a form."
						icon="solar:link-bold-duotone"
					>
						<div className="flex flex-col gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<Button type="button" variant="outline" size="sm" onClick={fillSourceTrackingPreset}>
									Fill test UTM preset
								</Button>
								<Button type="button" variant="outline" size="sm" onClick={addSourceTrackingRow}>
									Add row
								</Button>
							</div>
							{sourceTrackingRows.length === 0 ? (
								<Text variant="caption" className="text-muted-foreground">
									No params configured. Add rows or use the test preset (utm_source, utm_campaign, utm_medium).
								</Text>
							) : (
								<div className="flex flex-col gap-2">
									{sourceTrackingRows.map((row, i) => (
										<div key={row.id} className="flex flex-wrap gap-2">
											<Input
												placeholder="utm_source"
												value={row.key}
												onChange={(e) => updateSourceTrackingRow(i, "key", e.target.value)}
												className="font-mono text-sm min-w-[120px] flex-1"
											/>
											<Input
												placeholder="slash-admin"
												value={row.value}
												onChange={(e) => updateSourceTrackingRow(i, "value", e.target.value)}
												className="font-mono text-sm min-w-[140px] flex-[2]"
											/>
											<Button type="button" variant="ghost" size="sm" onClick={() => removeSourceTrackingRow(i)}>
												Remove
											</Button>
										</div>
									))}
								</div>
							)}
							<div className="flex flex-wrap items-center gap-2">
								<Button onClick={handleAddSourceTracking} disabled={!sourceTrackingRows.some((row) => row.key.trim())}>
									Apply source tracking
								</Button>
							</div>
							<ResultMessage message={sourceTrackingResult} />
						</div>
					</Section>

					<Section title="showForm" description="Open a form by ID. Reset mode: always, on-complete, or never." icon="solar:document-bold-duotone">
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="feedback-id-1">Form ID 1</Label>
								<div className="flex flex-wrap items-end gap-2">
									<Input
										id="feedback-id-1"
										value={feedbackFormId1}
										onChange={(e) => setFeedbackFormId1(e.target.value)}
										placeholder={getEncatchFeedbackFormId1() || "Set on login screen"}
										className="flex-1 min-w-[120px]"
									/>
									<Select value={resetMode1} onValueChange={(v) => setResetMode1(v as ResetMode)}>
										<SelectTrigger className="w-[130px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="always">always</SelectItem>
											<SelectItem value="on-complete">on-complete</SelectItem>
											<SelectItem value="never">never</SelectItem>
										</SelectContent>
									</Select>
									<Button onClick={handleOpenForm1}>Open form 1</Button>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="feedback-id-2">Form ID 2</Label>
								<div className="flex flex-wrap items-end gap-2">
									<Input
										id="feedback-id-2"
										value={feedbackFormId2}
										onChange={(e) => setFeedbackFormId2(e.target.value)}
										placeholder={getEncatchFeedbackFormId2() || "Set on login screen"}
										className="flex-1 min-w-[120px]"
									/>
									<Select value={resetMode2} onValueChange={(v) => setResetMode2(v as ResetMode)}>
										<SelectTrigger className="w-[130px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="always">always</SelectItem>
											<SelectItem value="on-complete">on-complete</SelectItem>
											<SelectItem value="never">never</SelectItem>
										</SelectContent>
									</Select>
									<Button onClick={handleOpenForm2}>Open form 2</Button>
								</div>
							</div>
							<div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
								<div className="flex items-center justify-between gap-2">
									<Label className="text-xs font-medium">Context (optional)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addShowFormContextRow}>
										Add row
									</Button>
								</div>
								{showFormContextRows.map((row, i) => (
									<div key={row.id} className="flex flex-wrap gap-2">
										<Input
											placeholder="key"
											value={row.key}
											onChange={(e) => updateShowFormContextRow(i, "key", e.target.value)}
											className="font-mono text-sm min-w-[100px] flex-1"
										/>
										<Input
											placeholder='value (JSON: 42, true, "text")'
											value={row.value}
											onChange={(e) => updateShowFormContextRow(i, "value", e.target.value)}
											className="font-mono text-sm min-w-[140px] flex-[2]"
										/>
										<Button type="button" variant="ghost" size="sm" onClick={() => removeShowFormContextRow(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<ResultMessage message={showFormResult} />
						</div>
					</Section>

					<Section
						title="Session: start, pause, resume, stop & resetUser"
						description="startSession enables ping + URL tracking. resetUser clears identity."
						icon="solar:play-circle-bold-duotone"
					>
						<div className="flex flex-col gap-2">
							<div className="flex flex-wrap items-center gap-2">
								<Button onClick={handleStartSession}>Start session</Button>
								<Button variant="outline" onClick={handlePauseSession}>
									Pause session
								</Button>
								<Button variant="outline" onClick={handleResumeSession}>
									Resume session
								</Button>
								<Button variant="outline" onClick={handleStopSession}>
									Stop session
								</Button>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Button variant="outline" onClick={handleResetUser}>
									Reset user
								</Button>
								<Button variant="outline" onClick={handleClearDeviceId}>
									Clear device ID
								</Button>
							</div>
							{(sessionResult || sessionRecordingResult || resetUserResult || clearDeviceIdResult) && (
								<ResultMessage message={[sessionResult, sessionRecordingResult, resetUserResult, clearDeviceIdResult].filter(Boolean).join(" · ")} />
							)}
						</div>
					</Section>
				</div>
			</div>

			{/* Other SDK methods */}
			<div className="grid gap-4 lg:grid-cols-2">
				<Section title="trackEvent & trackScreen" description="Fire a custom event or track a screen view." icon="solar:graph-up-bold-duotone">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="event-name">Event name</Label>
							<div className="flex gap-2">
								<Input id="event-name" value={trackEventName} onChange={(e) => setTrackEventName(e.target.value)} placeholder="test_event" className="flex-1" />
								<Button onClick={handleTrackEvent}>Fire event</Button>
							</div>
							<ResultMessage message={trackResult} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="screen-name">Screen name</Label>
							<div className="flex gap-2">
								<Input
									id="screen-name"
									value={screenName}
									onChange={(e) => setScreenName(e.target.value)}
									placeholder={window.location.href}
									className="flex-1"
								/>
								<Button onClick={handleTrackScreen}>Track screen</Button>
							</div>
							<ResultMessage message={trackScreenResult} />
						</div>
					</div>
				</Section>

				<Section
					title="setTheme, setLocale, setCountry"
					description="Theme for Encatch UI; locale and country for form content and localization."
					icon="solar:palette-bold-duotone"
				>
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="encatch-theme" className="text-muted-foreground text-xs shrink-0">
								Theme
							</Label>
							<Select value={theme} onValueChange={(value) => setTheme(parseStoredTheme(value))}>
								<SelectTrigger id="encatch-theme" className="w-[130px]">
									<SelectValue placeholder="Select theme" />
								</SelectTrigger>
								<SelectContent>
									{ENCATCH_THEME_OPTIONS.map((opt) => (
										<SelectItem key={opt} value={opt}>
											{opt.charAt(0).toUpperCase() + opt.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button size="sm" onClick={handleSetTheme}>
								Set
							</Button>
							<ResultMessage message={themeResult} />
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="language" className="text-muted-foreground text-xs shrink-0">
								Locale
							</Label>
							<Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="w-20" />
							<Button size="sm" onClick={handleSetLocale}>
								Set
							</Button>
							<ResultMessage message={languageResult} />
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="country" className="text-muted-foreground text-xs shrink-0">
								Country
							</Label>
							<Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" className="w-20" />
							<Button size="sm" onClick={handleSetCountry}>
								Set
							</Button>
							<ResultMessage message={countryResult} />
						</div>
					</div>
				</Section>

				<Section
					title="Device info: type, OS, browser"
					description="Test environment only — pick device type, OS, and browser manually."
					icon="solar:smartphone-bold-duotone"
				>
					<div className="flex flex-col gap-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="test-device-type" className="text-xs">
									Device type
								</Label>
								<Select value={deviceType} onValueChange={setDeviceType}>
									<SelectTrigger id="test-device-type">
										<SelectValue placeholder="Select device type" />
									</SelectTrigger>
									<SelectContent>
										{DEVICE_TYPE_OPTIONS.map((opt) => (
											<SelectItem key={opt} value={opt}>
												{opt}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="test-device-os" className="text-xs">
									Device OS
								</Label>
								<Select value={deviceOs} onValueChange={setDeviceOs}>
									<SelectTrigger id="test-device-os">
										<SelectValue placeholder="Select device OS" />
									</SelectTrigger>
									<SelectContent>
										{DEVICE_OS_OPTIONS.map((opt) => (
											<SelectItem key={opt} value={opt}>
												{opt}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="test-device-os-version" className="text-xs">
									Device OS version
								</Label>
								<Input id="test-device-os-version" value={deviceOsVersion} onChange={(e) => setDeviceOsVersion(e.target.value)} placeholder="e.g. 11" />
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="test-browser" className="text-xs">
									Browser
								</Label>
								<Select value={browser} onValueChange={setBrowser}>
									<SelectTrigger id="test-browser">
										<SelectValue placeholder="Select browser" />
									</SelectTrigger>
									<SelectContent>
										{BROWSER_OPTIONS.map((opt) => (
											<SelectItem key={opt} value={opt}>
												{opt}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1.5 sm:col-span-2">
								<Label htmlFor="test-browser-version" className="text-xs">
									Browser version
								</Label>
								<Input id="test-browser-version" value={browserVersion} onChange={(e) => setBrowserVersion(e.target.value)} placeholder="e.g. 124.0" />
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button type="button" size="sm" onClick={handleSetDeviceInfo}>
								Set device info
							</Button>
							<Button type="button" variant="outline" size="sm" onClick={handlePushDeviceInfo}>
								Set &amp; send (identify / session)
							</Button>
							<Button type="button" variant="outline" size="sm" onClick={handleRandomDeviceInfo} title="Generate random device type, OS, and browser">
								Random
							</Button>
							<Button type="button" variant="ghost" size="sm" onClick={handleResetDeviceInfoDefaults}>
								Reset defaults
							</Button>
						</div>
						<ResultMessage message={deviceInfoResult} />
					</div>
				</Section>

				<Section title="addToResponse" description="Stage answers by question type, then apply before opening a form." icon="solar:pen-new-square-bold-duotone">
					<AddToResponsePrefillRows
						rows={prefillRows}
						onChange={setPrefillRows}
						onApply={handleAddToResponse}
						applyDisabled={!prefillRows.some((r) => r.questionId.trim())}
						result={addToResponseResult}
					/>
				</Section>
			</div>
		</div>
	);
}
