import { Icon } from "@/components/icon";
import {
	ENCATCH_DEFAULT_HOST,
	ENCATCH_HOST_OPTIONS,
	ENCATCH_STORAGE_KEYS,
	ENCATCH_TEST_STORAGE_KEYS,
	getEncatchFeedbackFormId1,
	getEncatchFeedbackFormId2,
	initEncatch,
	_encatch,
	mapTraitsToSdk,
} from "@/lib/encatch";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text } from "@/ui/typography";
import { clearAllStorageOnLogout } from "@/utils/storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ResetMode = "always" | "on-complete" | "never";

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

async function generateHMACSignature(userId: string, secretKey: string, datetimeUTC?: string): Promise<string> {
	const message = datetimeUTC ? `${userId}|${datetimeUTC}` : userId;
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

function getApiKeysList(): string[] {
	try {
		const raw = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEYS_LIST) ?? "[]";
		const arr = JSON.parse(raw);
		return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
	} catch {
		return [];
	}
}

function addApiKeyToList(key: string): void {
	if (!key.trim()) return;
	const list = getApiKeysList();
	if (list.includes(key.trim())) return;
	list.unshift(key.trim());
	localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEYS_LIST, JSON.stringify(list.slice(0, 20)));
}

function generateRandomUser(): { username: string; email: string; displayName: string } {
	const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
	return {
		username: `user_${id}`,
		email: `user_${id}@example.com`,
		displayName: `Test User ${id.slice(0, 6)}`,
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

	// setLocale / setCountry
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
	const [showFormResult, setShowFormResult] = useState<string | null>(null);

	// addToResponse
	const [prefillQuestionId, setPrefillQuestionId] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_QUESTION_ID));
	const [prefillValue, setPrefillValue] = useState(() => getTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_VALUE));
	const [addToResponseResult, setAddToResponseResult] = useState<string | null>(null);

	// Encatch config (API key + host) — from localStorage, synced with login
	const [encatchApiKey, setEncatchApiKey] = useState("");
	const [encatchHost, setEncatchHost] = useState(ENCATCH_DEFAULT_HOST);
	const [savedApiKeys, setSavedApiKeys] = useState<string[]>([]);
	const [initResult, setInitResult] = useState<string | null>(null);

	// Session / reset
	const [sessionResult, setSessionResult] = useState<string | null>(null);
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

	// Load Encatch config and saved API keys from localStorage on mount
	useEffect(() => {
		try {
			setEncatchApiKey(localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEY) ?? "");
			const storedHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.HOST)?.trim() ?? "";
			setEncatchHost(storedHost || ENCATCH_DEFAULT_HOST);
			setSavedApiKeys(getApiKeysList());
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
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.LANGUAGE, language);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.COUNTRY, country);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.FEEDBACK_FORM_ID_1, feedbackFormId1);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.FEEDBACK_FORM_ID_2, feedbackFormId2);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.RESET_MODE_1, resetMode1);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.RESET_MODE_2, resetMode2);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_QUESTION_ID, prefillQuestionId);
		setTestStored(ENCATCH_TEST_STORAGE_KEYS.PREFILL_VALUE, prefillValue);
	}, [
		identifyUserName,
		identifySetEmail,
		identifySetDisplayName,
		trackEventName,
		screenName,
		language,
		country,
		feedbackFormId1,
		feedbackFormId2,
		resetMode1,
		resetMode2,
		prefillQuestionId,
		prefillValue,
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
				const datetimeUTC = identifyIncludeDateTime ? new Date().toISOString() : undefined;
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

	const handleSetTheme = (theme: "light" | "dark" | "system") => {
		try {
			_encatch.setTheme(theme);
		} catch (_) {}
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

	const handleOpenForm1 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId1.trim() || getEncatchFeedbackFormId1();
			_encatch.showForm(formId, { reset: resetMode1 });
			setShowFormResult(`Form 1 opened (${formId}) with reset=${resetMode1}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleOpenForm2 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId2.trim() || getEncatchFeedbackFormId2();
			_encatch.showForm(formId, { reset: resetMode2 });
			setShowFormResult(`Form 2 opened (${formId}) with reset=${resetMode2}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleAddToResponse = () => {
		setAddToResponseResult(null);
		try {
			const qId = prefillQuestionId.trim();
			if (!qId) {
				setAddToResponseResult("Error: question ID is required");
				return;
			}
			const value = prefillValue.trim() || prefillValue;
			_encatch.addToResponse(qId, value);
			setAddToResponseResult(`Prefill set: ${qId} = ${JSON.stringify(value)}`);
		} catch (e) {
			setAddToResponseResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleRandomUser = () => {
		const { username, email, displayName } = generateRandomUser();
		setIdentifyUserName(username);
		setIdentifySetEmail(email);
		setIdentifySetDisplayName(displayName);
	};

	const saveEncatchConfig = () => {
		try {
			const key = encatchApiKey.trim();
			localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, key);
			localStorage.setItem(ENCATCH_STORAGE_KEYS.HOST, encatchHost);
			if (key) addApiKeyToList(key);
			setSavedApiKeys(getApiKeysList());
			toast.success("Encatch config saved. Click Initialize SDK or reload to apply.");
		} catch {
			toast.error("Failed to save Encatch config.");
		}
	};

	const handleInitializeSdk = () => {
		setInitResult(null);
		try {
			localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, encatchApiKey.trim());
			localStorage.setItem(ENCATCH_STORAGE_KEYS.HOST, encatchHost);
			if (encatchApiKey.trim()) addApiKeyToList(encatchApiKey.trim());
			setSavedApiKeys(getApiKeysList());
			initEncatch();
			setInitResult("initEncatch() called. If SDK was already initialized, reload the page to use a new API key.");
			toast.success("SDK initialization requested.");
		} catch (e) {
			setInitResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
			toast.error("Failed to initialize SDK.");
		}
	};

	const handleClearTestStorage = () => {
		try {
			clearAllStorageOnLogout();
			// Reset form state to defaults
			setEncatchApiKey("");
			setEncatchHost(ENCATCH_DEFAULT_HOST);
			setIdentifyUserName("user_123");
			setIdentifySetEmail("user_123@example.com");
			setIdentifySetDisplayName("Test User");
			setTrackEventName("test_event");
			setScreenName("/dashboard/encatch-test");
			setLanguage("en");
			setCountry("US");
			setFeedbackFormId1("");
			setFeedbackFormId2("");
			setResetMode1("always");
			setResetMode2("always");
			setPrefillQuestionId("");
			setPrefillValue("");
			setSavedApiKeys([]);
			toast.success("All storage cleared (localStorage, sessionStorage, cookies, IndexedDB).");
		} catch {
			toast.error("Failed to clear storage.");
		}
	};

	/** Clear localStorage, sessionStorage, and IndexedDB but keep Encatch API key, host, and API keys list. */
	const handleClearAllExceptApiKey = async () => {
		try {
			let savedApiKey: string | null = null;
			let savedHost: string | null = null;
			let savedApiKeysList: string | null = null;
			if (typeof localStorage !== "undefined") {
				savedApiKey = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEY);
				savedHost = localStorage.getItem(ENCATCH_STORAGE_KEYS.HOST);
				savedApiKeysList = localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEYS_LIST);
				localStorage.clear();
				if (savedApiKey != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, savedApiKey);
				if (savedHost != null) localStorage.setItem(ENCATCH_STORAGE_KEYS.HOST, savedHost);
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
			setEncatchHost(savedHost?.trim() || ENCATCH_DEFAULT_HOST);
			setIdentifyUserName("user_123");
			setIdentifySetEmail("user_123@example.com");
			setIdentifySetDisplayName("Test User");
			setTrackEventName("test_event");
			setScreenName("/dashboard/encatch-test");
			setLanguage("en");
			setCountry("US");
			setFeedbackFormId1("");
			setFeedbackFormId2("");
			setResetMode1("always");
			setResetMode2("always");
			setPrefillQuestionId("");
			setPrefillValue("");
			setSavedApiKeys(getApiKeysList());
			toast.success("Cleared local/session/IndexedDB; API key, host, and saved keys kept.");
		} catch {
			toast.error("Failed to clear storage.");
		}
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

			{/* Encatch config: API key, host, save, initialize */}
			<Section title="Encatch config" description="API key and host. Saved keys appear in the dropdown. Values are stored in localStorage.">
				<div className="flex flex-col gap-3">
					{savedApiKeys.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="encatch-api-key-select">Saved API keys</Label>
							<Select
								value={encatchApiKey && savedApiKeys.includes(encatchApiKey) ? encatchApiKey : ""}
								onValueChange={(val) => {
									setEncatchApiKey(val);
									localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, val);
								}}
							>
								<SelectTrigger id="encatch-api-key-select" className="w-full max-w-md">
									<SelectValue placeholder="Select a saved API key" />
								</SelectTrigger>
								<SelectContent>
									{savedApiKeys.map((k) => (
										<SelectItem key={k} value={k} className="font-mono text-xs">
											{k.length > 28 ? `${k.slice(0, 28)}…` : k}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="encatch-api-key">Encatch API key</Label>
						<Input
							id="encatch-api-key"
							type="text"
							placeholder="e.g. en_dev_..."
							value={encatchApiKey}
							onChange={(e) => setEncatchApiKey(e.target.value)}
							autoComplete="off"
							className="max-w-md"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="encatch-host">Encatch host</Label>
						<Select value={encatchHost} onValueChange={setEncatchHost}>
							<SelectTrigger id="encatch-host" className="w-full max-w-md">
								<SelectValue placeholder="Select host" />
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
					<div className="flex flex-wrap items-center gap-2">
						<Button type="button" variant="outline" size="sm" onClick={saveEncatchConfig}>
							Save Encatch config
						</Button>
						<Button type="button" size="sm" onClick={handleInitializeSdk}>
							Initialize SDK
						</Button>
						<Button type="button" variant="destructive" size="sm" onClick={handleClearTestStorage}>
							Clear test page storage
						</Button>
						<Button type="button" variant="destructive" size="sm" onClick={() => handleClearAllExceptApiKey()}>
							Clear all storage (keep API key)
						</Button>
					</div>
					{initResult && (
						<Text variant="caption" className="text-muted-foreground">
							{initResult}
						</Text>
					)}
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
										Include datetime in signature
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
							<Label className="text-muted-foreground text-xs shrink-0">Theme</Label>
							<Button variant="outline" size="sm" onClick={() => handleSetTheme("light")}>
								Light
							</Button>
							<Button variant="outline" size="sm" onClick={() => handleSetTheme("dark")}>
								Dark
							</Button>
							<Button variant="outline" size="sm" onClick={() => handleSetTheme("system")}>
								System
							</Button>
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

				<Section title="startSession & resetUser" description="Start session (ping + URL tracking) or clear user/session (e.g. on logout).">
					<div className="flex flex-col gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Button onClick={handleStartSession}>Start session</Button>
							<Button variant="outline" onClick={handleResetUser}>
								Reset user
							</Button>
							<Button variant="outline" onClick={handleClearDeviceId}>
								Clear device ID
							</Button>
						</div>
						{(sessionResult || resetUserResult || clearDeviceIdResult) && (
							<Text variant="caption" className="text-muted-foreground">
								{sessionResult ?? resetUserResult ?? clearDeviceIdResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="showForm" description="Open a form by configuration ID. Reset mode: always (default), on-complete, or never.">
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

				<Section title="addToResponse" description="Prefill a form question by ID. Stored for current and future showForm(); also sent to visible iframes.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="prefill-question-id">Question ID</Label>
						<Input
							id="prefill-question-id"
							value={prefillQuestionId}
							onChange={(e) => setPrefillQuestionId(e.target.value)}
							placeholder="e.g. email or question slug"
						/>
						<Label htmlFor="prefill-value">Value</Label>
						<Input id="prefill-value" value={prefillValue} onChange={(e) => setPrefillValue(e.target.value)} placeholder="Value to prefill" />
						<Button onClick={handleAddToResponse}>Add to response</Button>
						{addToResponseResult && (
							<Text variant="caption" className="text-muted-foreground">
								{addToResponseResult}
							</Text>
						)}
					</div>
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
