import { Icon } from "@/components/icon";
import {
	ENCATCH_DEFAULT_HOST,
	ENCATCH_HOST_OPTIONS,
	ENCATCH_STORAGE_KEYS,
	ENCATCH_TEST_STORAGE_KEYS,
	type EncatchSavedApiKeyEntry,
	formatEncatchApiKeyPreview,
	formatEncatchSavedApiKeyLabel,
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
	_encatch,
	mapTraitsToSdk,
	setEncatchApiKeyForHost,
} from "@/lib/encatch";
import {
	BROWSER_OPTIONS,
	DEFAULT_DEVICE_INFO_TEST_VALUES,
	DEVICE_OS_OPTIONS,
	DEVICE_TYPE_OPTIONS,
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
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text } from "@/ui/typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
	const [savedApiKeyEntries, setSavedApiKeyEntries] = useState<EncatchSavedApiKeyEntry[]>([]);
	const [initResult, setInitResult] = useState<string | null>(null);

	// Session / reset
	const [sessionResult, setSessionResult] = useState<string | null>(null);
	const [sessionRecordingResult, setSessionRecordingResult] = useState<string | null>(null);
	const [resetUserResult, setResetUserResult] = useState<string | null>(null);
	const [clearDeviceIdResult, setClearDeviceIdResult] = useState<string | null>(null);

	// Event log (on callback)
	const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
	const eventLogRef = useRef<EventLogEntry[]>([]);
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
			setTrackResult(`Track event fired: ${trackEventName.trim() || "unnamed_event"}`);
		} catch (e) {
			setTrackResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
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
			setIdentifyResult(`Identify called for: ${userName}`);
		} catch (e) {
			setIdentifyResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
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

	const handleSetTheme = () => {
		setThemeResult(null);
		try {
			_encatch.setTheme(theme);
			setThemeResult(`Theme set to: ${theme}`);
		} catch (e) {
			setThemeResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleSetLocale = () => {
		setLanguageResult(null);
		try {
			_encatch.setLocale(language.trim() || "en");
			setLanguageResult(`Locale set to: ${language.trim() || "en"}`);
		} catch (e) {
			setLanguageResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleSetCountry = () => {
		setCountryResult(null);
		try {
			_encatch.setCountry(country.trim() || "US");
			setCountryResult(`Country set to: ${country.trim() || "US"}`);
		} catch (e) {
			setCountryResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleTrackScreen = () => {
		setTrackScreenResult(null);
		try {
			_encatch.trackScreen(screenName.trim() || window.location.href);
			setTrackScreenResult(`Screen tracked: ${screenName.trim() || window.location.href}`);
		} catch (e) {
			setTrackScreenResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleStartSession = () => {
		setSessionResult(null);
		try {
			_encatch.startSession();
			setSessionResult("Session started (ping interval + URL tracking enabled)");
		} catch (e) {
			setSessionResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handlePauseSession = () => {
		setSessionRecordingResult(null);
		try {
			encatchPauseSession();
			setSessionRecordingResult("pauseSession() called");
		} catch (e) {
			setSessionRecordingResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleResumeSession = () => {
		setSessionRecordingResult(null);
		try {
			encatchResumeSession();
			setSessionRecordingResult("resumeSession() called");
		} catch (e) {
			setSessionRecordingResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleStopSession = () => {
		setSessionRecordingResult(null);
		try {
			encatchStopSession();
			setSessionRecordingResult("stopSession() called");
		} catch (e) {
			setSessionRecordingResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleResetUser = () => {
		setResetUserResult(null);
		try {
			_encatch.resetUser();
			setResetUserResult("User reset (anonymous; session cleared)");
		} catch (e) {
			setResetUserResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const ENCATCH_DEVICE_ID_KEY = "encatch_device_id";
	const handleClearDeviceId = () => {
		setClearDeviceIdResult(null);
		try {
			if (typeof localStorage !== "undefined") {
				localStorage.removeItem(ENCATCH_DEVICE_ID_KEY);
				setClearDeviceIdResult("encatch_device_id removed from localStorage. Refresh the page for a new device ID.");
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
			setDeviceInfoResult(
				`Device info set: type=${values.deviceType}, OS=${values.deviceOs}, browser=${values.browser}. Sent on next identifyUser / startSession / trackEvent.`,
			);
		} catch (e) {
			setDeviceInfoResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
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

	const handlePushDeviceInfo = () => {
		setDeviceInfoResult(null);
		try {
			saveDeviceInfoTestValues(buildDeviceValuesFromFields());
			if (identifyUserName.trim()) {
				void handleIdentify();
				setDeviceInfoResult("Device info saved and identify user called — check $deviceInfo in the network tab.");
			} else {
				_encatch.startSession();
				setDeviceInfoResult("Device info saved and session started — check $deviceInfo on ping/track requests.");
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
				setShowFormResult(`Error: showForm context values must be string, number, or boolean (use JSON literals). Invalid keys: ${skippedKeys.join(", ")}`);
				return;
			}
			_encatch.showForm(formId, { reset: resetMode1, ...(context ? { context } : {}) });
			const ctxMsg = context ? `, context=${JSON.stringify(context)}` : "";
			setShowFormResult(`Form 1 opened (${formId}) with reset=${resetMode1}${ctxMsg}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleOpenForm2 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId2.trim() || getEncatchFeedbackFormId2();
			const { context, skippedKeys } = buildShowFormContext(showFormContextRows);
			if (skippedKeys.length > 0) {
				setShowFormResult(`Error: showForm context values must be string, number, or boolean (use JSON literals). Invalid keys: ${skippedKeys.join(", ")}`);
				return;
			}
			_encatch.showForm(formId, { reset: resetMode2, ...(context ? { context } : {}) });
			const ctxMsg = context ? `, context=${JSON.stringify(context)}` : "";
			setShowFormResult(`Form 2 opened (${formId}) with reset=${resetMode2}${ctxMsg}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
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
			setAddToResponseResult(`Error: ${errors.join("; ")}.${appliedMsg}`);
			return;
		}
		setAddToResponseResult(`Added ${applied.length} response${applied.length === 1 ? "" : "s"}: ${applied.join("; ")}`);
	};

	const handleRandomUser = () => {
		const { username, email, displayName } = generateRandomUser();
		setIdentifyUserName(username);
		setIdentifySetEmail(email);
		setIdentifySetDisplayName(displayName);
	};

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

	const refreshSavedApiKeyEntries = () => {
		setSavedApiKeyEntries(getEncatchSavedApiKeyEntries());
	};

	const saveEncatchConfig = () => {
		try {
			const key = encatchApiKey.trim();
			setEncatchApiKeyForHost(encatchHost, key);
			refreshSavedApiKeyEntries();
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
			refreshSavedApiKeyEntries();
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

	/** Clear localStorage, sessionStorage, and IndexedDB but keep Encatch API key, host, and API keys list. */
	const handleClearAllExceptApiKey = async () => {
		try {
			let savedApiKey: string | null = null;
			let savedHost: string | null = null;
			let savedApiKeysByHost: string | null = null;
			let savedApiKeysList: string | null = null;
			if (typeof localStorage !== "undefined") {
				savedApiKey = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEY);
				savedHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.HOST);
				savedApiKeysByHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEYS_BY_HOST);
				savedApiKeysList = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEYS_LIST);
				localStorage.clear();
				if (savedApiKey != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, savedApiKey);
				if (savedHost != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.HOST, savedHost);
				if (savedApiKeysByHost != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEYS_BY_HOST, savedApiKeysByHost);
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
			setEncatchHost(host);
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
			setPrefillRows([newAddToResponsePrefillRow()]);
			refreshSavedApiKeyEntries();
			toast.success("Cleared local/session/IndexedDB; API key, host, and saved keys kept.");
		} catch {
			toast.error("Failed to clear storage.");
		}
	};

	const handleClearAllExceptApiKeyAndReload = async () => {
		await handleClearAllExceptApiKey();
		window.location.reload();
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:bug-minimalistic-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch SDK Test</h2>
					<Text variant="body2" className="text-muted-foreground">
						Test all @encatch/web-sdk methods via _encatch. Ensure Encatch is initialized (e.g. via EncatchProvider).
					</Text>
				</div>
			</div>

			{/* Encatch config */}
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
											className="h-auto min-w-[10rem] flex-col items-start gap-0.5 px-3 py-2 text-left font-normal"
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

					<div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" size="sm" onClick={saveEncatchConfig}>
								Save config
							</Button>
							<Button type="button" size="sm" onClick={handleInitializeSdk}>
								Initialize SDK
							</Button>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={() => handleClearAllExceptApiKeyAndReload()}
						>
							Clear storage (keep keys) & reload
						</Button>
					</div>
				</div>
			</Section>

			{/* Event log from _encatch.on() */}
			<Section
				title="on (event subscription)"
				description="Subscribe to form/SDK events. Last events appear below (form:show, form:complete, form:close, etc.)."
			>
				<div className="flex flex-col gap-2">
					<Text variant="caption" className="text-muted-foreground">
						Events received:
					</Text>
					{eventLog.length === 0 ? (
						<Text variant="caption" className="text-muted-foreground italic">
							No events yet. Open a form or interact to see events.
						</Text>
					) : (
						<ul className="max-h-48 overflow-y-auto rounded border border-input bg-muted/30 p-2 font-mono text-xs">
							{eventLog.map((entry, i) => (
								<li key={`${entry.at}-${i}`} className="flex flex-col gap-0.5 py-1">
									<span className="font-semibold text-foreground">{entry.eventType}</span>
									<span className="text-muted-foreground">
										{entry.payload.formId != null ? `formId: ${entry.payload.formId}` : ""}
										{entry.payload.data != null ? ` | data: ${JSON.stringify(entry.payload.data)}` : ""}
									</span>
									<span className="text-muted-foreground/70">{entry.at}</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</Section>

			<div className="grid gap-4 md:grid-cols-2">
				<Section
					title="trackEvent & trackScreen"
					description="Fire a custom event or track a screen view. Screen tracking can be automatic after startSession()."
				>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="track-event-name">Event name</Label>
							<div className="flex gap-2">
								<Input
									id="track-event-name"
									value={trackEventName}
									onChange={(e) => setTrackEventName(e.target.value)}
									placeholder="e.g. button_clicked"
									className="flex-1"
								/>
								<Button onClick={handleTrackEvent}>Fire event</Button>
							</div>
							{trackResult && (
								<Text variant="caption" className="text-muted-foreground">
									{trackResult}
								</Text>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="screen-name">Screen name</Label>
							<div className="flex gap-2">
								<Input
									id="screen-name"
									value={screenName}
									onChange={(e) => setScreenName(e.target.value)}
									placeholder="/dashboard/encatch-test"
									className="flex-1"
								/>
								<Button variant="outline" onClick={handleTrackScreen}>
									Track screen
								</Button>
							</div>
							{trackScreenResult && (
								<Text variant="caption" className="text-muted-foreground">
									{trackScreenResult}
								</Text>
							)}
						</div>
					</div>
				</Section>

				<Section title="identifyUser" description="Identify the current user. Fill simple fields; generated traits JSON is shown below.">
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
						{identifyResult && (
							<Text variant="caption" className="text-muted-foreground">
								{identifyResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="setTheme, setLocale, setCountry" description="Theme for Encatch UI; locale and country for form content and localization.">
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
							{themeResult && (
								<Text variant="caption" className="text-muted-foreground">
									{themeResult}
								</Text>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="language" className="text-muted-foreground text-xs shrink-0">
								Locale
							</Label>
							<Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="w-20" />
							<Button size="sm" onClick={handleSetLocale}>
								Set
							</Button>
							{languageResult && (
								<Text variant="caption" className="text-muted-foreground">
									{languageResult}
								</Text>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="country" className="text-muted-foreground text-xs shrink-0">
								Country
							</Label>
							<Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" className="w-20" />
							<Button size="sm" onClick={handleSetCountry}>
								Set
							</Button>
							{countryResult && (
								<Text variant="caption" className="text-muted-foreground">
									{countryResult}
								</Text>
							)}
						</div>
					</div>
				</Section>

				<Section
					title="Device info: type, OS, browser"
					description="Test environment only — pick device type, OS, and browser manually (not auto-detected). Click Set device info, then identify or start session. Values are injected into $deviceInfo on Encatch API requests by the slash-admin test harness."
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
							<Button type="button" variant="ghost" size="sm" onClick={handleResetDeviceInfoDefaults}>
								Reset defaults
							</Button>
						</div>
						{deviceInfoResult && (
							<Text variant="caption" className="text-muted-foreground">
								{deviceInfoResult}
							</Text>
						)}
					</div>
				</Section>

				<Section
					title="Session: start, pause, resume, stop & resetUser"
					description="startSession enables ping + URL tracking. pauseSession / resumeSession / stopSession are provided by the loaded Encatch script (see encatch.js). resetUser clears identity; clear device ID forces a new device on reload."
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
							<Text variant="caption" className="text-muted-foreground">
								{[sessionResult, sessionRecordingResult, resetUserResult, clearDeviceIdResult].filter(Boolean).join(" · ")}
							</Text>
						)}
					</div>
				</Section>

				<Section
					title="showForm"
					description="Open a form by configuration ID. Reset mode: always (default), on-complete, or never. Optional context is passed to showForm(options) (string, number, or boolean per value — use JSON literals like addToResponse)."
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
							<div className="flex items-center justify-between gap-2">
								<Label className="text-xs font-medium">Context (optional)</Label>
								<Button type="button" variant="outline" size="sm" onClick={addShowFormContextRow}>
									Add row
								</Button>
							</div>
							<Text variant="caption" className="text-muted-foreground">
								Same row set is used for both Open form 1 and Open form 2. Plain text is a string; use JSON for numbers/booleans (e.g. 42, true,
								&quot;hello&quot;).
							</Text>
							{showFormContextRows.length === 0 && (
								<Text variant="caption" className="text-muted-foreground italic">
									No context rows — showForm is called without context.
								</Text>
							)}
							{showFormContextRows.map((row, i) => (
								<div key={row.id} className="flex flex-wrap gap-2">
									<Input
										placeholder="key"
										value={row.key}
										onChange={(e) => updateShowFormContextRow(i, "key", e.target.value)}
										className="font-mono text-sm min-w-[100px] flex-1"
									/>
									<Input
										placeholder='value or JSON: 42, true, "text"'
										value={row.value}
										onChange={(e) => updateShowFormContextRow(i, "value", e.target.value)}
										className="font-mono text-sm min-w-[140px] flex-2"
									/>
									<Button type="button" variant="ghost" size="sm" onClick={() => removeShowFormContextRow(i)}>
										Remove
									</Button>
								</div>
							))}
						</div>
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
								<div className="flex items-center gap-2 shrink-0">
									<Label htmlFor="reset-mode-1" className="text-muted-foreground text-xs whitespace-nowrap">
										Reset
									</Label>
									<select
										id="reset-mode-1"
										className="rounded-md border border-input bg-background px-3 py-2 text-sm w-[130px]"
										value={resetMode1}
										onChange={(e) => setResetMode1(e.target.value as ResetMode)}
									>
										<option value="always">always</option>
										<option value="on-complete">on-complete</option>
										<option value="never">never</option>
									</select>
								</div>
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
								<div className="flex items-center gap-2 shrink-0">
									<Label htmlFor="reset-mode-2" className="text-muted-foreground text-xs whitespace-nowrap">
										Reset
									</Label>
									<select
										id="reset-mode-2"
										className="rounded-md border border-input bg-background px-3 py-2 text-sm w-[130px]"
										value={resetMode2}
										onChange={(e) => setResetMode2(e.target.value as ResetMode)}
									>
										<option value="always">always</option>
										<option value="on-complete">on-complete</option>
										<option value="never">never</option>
									</select>
								</div>
								<Button onClick={handleOpenForm2}>Open form 2</Button>
							</div>
						</div>
						{showFormResult && (
							<Text variant="caption" className="text-muted-foreground">
								{showFormResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="addToResponse" description="Stage answers by question type, then apply before opening a form.">
					<AddToResponsePrefillRows
						rows={prefillRows}
						onChange={setPrefillRows}
						onApply={handleAddToResponse}
						applyDisabled={!prefillRows.some((r) => r.questionId.trim())}
						result={addToResponseResult}
					/>
				</Section>
			</div>

			<Section
				title="init"
				description="init(apiKey, config) is called once by EncatchProvider on app load. Use the Encatch config section above to set API key and host, then click Initialize SDK (or reload)."
			>
				<Text variant="caption" className="text-muted-foreground">
					Set the Encatch API key and host in the Encatch config section above, then click &quot;Initialize SDK&quot;. If the SDK was already initialized with
					another key, reload the page to apply a new one.
				</Text>
			</Section>
		</div>
	);
}
