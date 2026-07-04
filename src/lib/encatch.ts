/**
 * Encatch Web SDK integration for Slash Admin.
 * Uses @encatch/web-sdk directly; no adapter. Call _encatch methods after initEncatch().
 * API key and feedback form IDs are read from localStorage (set on the login screen).
 */

import { _encatch } from "@encatch/web-sdk";
import type { EncatchConfig, UserTraits } from "@encatch/web-sdk";

/** localStorage keys for Encatch config (set on login screen). */
export const ENCATCH_STORAGE_KEYS = {
	API_KEY: "encatch_api_key",
	/** JSON map of host URL → API key (dev / uat / prod). */
	API_KEYS_BY_HOST: "encatch_api_keys_by_host",
	HOST: "encatch_host",
	FEEDBACK_FORM_ID_1: "encatch_feedback_form_id_1",
	FEEDBACK_FORM_ID_2: "encatch_feedback_form_id_2",
	/** JSON array of used API keys for dropdown on encatch-test page. */
	API_KEYS_LIST: "encatch_api_keys_list",
} as const;

/** localStorage keys for encatch-test page form state (persist across reload). */
export const ENCATCH_TEST_STORAGE_KEYS = {
	IDENTIFY_USERNAME: "encatch_test_identify_username",
	IDENTIFY_EMAIL: "encatch_test_identify_email",
	IDENTIFY_DISPLAY_NAME: "encatch_test_identify_display_name",
	TRACK_EVENT_NAME: "encatch_test_track_event_name",
	SCREEN_NAME: "encatch_test_screen_name",
	LANGUAGE: "encatch_test_language",
	COUNTRY: "encatch_test_country",
	THEME: "encatch_test_theme",
	FEEDBACK_FORM_ID_1: "encatch_test_feedback_form_id_1",
	FEEDBACK_FORM_ID_2: "encatch_test_feedback_form_id_2",
	RESET_MODE_1: "encatch_test_reset_mode_1",
	RESET_MODE_2: "encatch_test_reset_mode_2",
	/** JSON array of { key, value } for showForm context (encatch-test page). */
	SHOW_FORM_CONTEXT_ROWS: "encatch_test_show_form_context_rows",
	/** JSON array of { questionId, questionType, value } for addToResponse (encatch-test page). */
	PREFILL_ROWS: "encatch_test_prefill_rows",
	/** @deprecated Migrated into PREFILL_ROWS on load */
	PREFILL_QUESTION_ID: "encatch_test_prefill_question_id",
	/** @deprecated Migrated into PREFILL_ROWS on load */
	PREFILL_VALUE: "encatch_test_prefill_value",
} as const;

/** Default Encatch host when none is configured (UAT). */
export const ENCATCH_DEFAULT_HOST = "https://form-uat.encatch.com";

/** Dropdown options for Encatch host on the login panel. */
export const ENCATCH_HOST_OPTIONS = [
	{ value: "https://form.dev.encatch.com", label: "form.dev.encatch.com" },
	{ value: "https://form-uat.encatch.com", label: "form-uat.encatch.com" },
	{ value: "https://form.encatch.com", label: "form.encatch.com" },
] as const;

function getStored(key: string): string {
	if (typeof window === "undefined" || typeof localStorage === "undefined") return "";
	try {
		return localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

function setStored(key: string, value: string): void {
	if (typeof window === "undefined" || typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(key, value);
	} catch {
		// ignore
	}
}

function getApiKeysByHostMap(): Record<string, string> {
	try {
		const raw = getStored(ENCATCH_STORAGE_KEYS.API_KEYS_BY_HOST);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		const out: Record<string, string> = {};
		for (const [host, value] of Object.entries(parsed as Record<string, unknown>)) {
			if (typeof value === "string") out[host] = value;
		}
		return out;
	} catch {
		return {};
	}
}

/** One saved API key tied to a host environment. */
export type EncatchSavedApiKeyEntry = {
	host: string;
	hostLabel: string;
	apiKey: string;
};

/** Saved API keys grouped by host (dev / uat / prod), in dropdown order. */
export function getEncatchSavedApiKeyEntries(): EncatchSavedApiKeyEntry[] {
	const map = { ...getApiKeysByHostMap() };
	const legacyKey = getStored(ENCATCH_STORAGE_KEYS.API_KEY).trim();
	const legacyHost = getStored(ENCATCH_STORAGE_KEYS.HOST).trim() || ENCATCH_DEFAULT_HOST;
	if (legacyKey && !map[legacyHost]?.trim()) {
		map[legacyHost] = legacyKey;
	}
	const entries: EncatchSavedApiKeyEntry[] = [];
	for (const opt of ENCATCH_HOST_OPTIONS) {
		const apiKey = map[opt.value]?.trim();
		if (apiKey) {
			entries.push({ host: opt.value, hostLabel: opt.label, apiKey });
		}
	}
	for (const [host, apiKey] of Object.entries(map)) {
		const trimmed = apiKey.trim();
		if (!trimmed) continue;
		if (ENCATCH_HOST_OPTIONS.some((opt) => opt.value === host)) continue;
		entries.push({ host, hostLabel: getEncatchHostLabel(host), apiKey: trimmed });
	}
	return entries;
}

/** Short preview for dropdown labels (keeps prefix + suffix). */
export function formatEncatchApiKeyPreview(apiKey: string): string {
	const trimmed = apiKey.trim();
	if (trimmed.length <= 24) return trimmed;
	return `${trimmed.slice(0, 14)}…${trimmed.slice(-8)}`;
}

/** Single-line label for saved host + API key dropdown rows. */
export function formatEncatchSavedApiKeyLabel(entry: EncatchSavedApiKeyEntry): string {
	return `${entry.hostLabel} · ${formatEncatchApiKeyPreview(entry.apiKey)}`;
}

/** Human-readable host label (e.g. form-uat.encatch.com). */
export function getEncatchHostLabel(host?: string): string {
	const h = (host ?? getEncatchHost()).trim();
	return ENCATCH_HOST_OPTIONS.find((opt) => opt.value === h)?.label ?? h;
}

/** API key saved for a specific host (dev / uat / prod). Falls back to legacy single key. */
export function getEncatchApiKeyForHost(host: string): string {
	const trimmedHost = host.trim();
	const fromMap = getApiKeysByHostMap()[trimmedHost]?.trim();
	if (fromMap) return fromMap;
	return getStored(ENCATCH_STORAGE_KEYS.API_KEY).trim();
}

/** Persist API key for a host and sync active key + host for initEncatch(). */
export function setEncatchApiKeyForHost(host: string, apiKey: string): void {
	const trimmedHost = host.trim();
	const trimmedKey = apiKey.trim();
	const map = getApiKeysByHostMap();
	if (trimmedKey) {
		map[trimmedHost] = trimmedKey;
	} else {
		delete map[trimmedHost];
	}
	setStored(ENCATCH_STORAGE_KEYS.API_KEYS_BY_HOST, JSON.stringify(map));
	setStored(ENCATCH_STORAGE_KEYS.API_KEY, trimmedKey);
	setStored(ENCATCH_STORAGE_KEYS.HOST, trimmedHost);
}

/** API key from localStorage for the currently selected host. */
export function getEncatchApiKey(): string {
	return getEncatchApiKeyForHost(getEncatchHost());
}

/** Host (e.g. https://form.dev.encatch.com) from localStorage. Empty means use default. */
export function getEncatchHost(): string {
	const stored = getStored(ENCATCH_STORAGE_KEYS.HOST).trim();
	return stored || ENCATCH_DEFAULT_HOST;
}

/** Origin passed to _encatch.init (respects dev proxy when host is unset). */
export function getEncatchInitOrigin(): string {
	if (typeof window === "undefined") return ENCATCH_DEFAULT_HOST;
	const storedHost = getStored(ENCATCH_STORAGE_KEYS.HOST).trim();
	if (storedHost) return storedHost;
	return import.meta.env.PROD ? ENCATCH_DEFAULT_HOST : window.location.origin;
}

/** Paired API origins for form.* web hosts (matches schema encatch-hosts). */
const ENCATCH_FORM_API_BASE_URL: Record<string, string> = {
	"form.dev.encatch.com": "https://api.dev.encatch.com",
	"form-uat.encatch.com": "https://api.uat.encatch.com",
	"form.encatch.com": "https://api.encatch.com",
};

/**
 * apiBaseUrl for init(). Form hosts map to api.*; local dev uses the app origin so Vite can proxy.
 */
export function getEncatchApiBaseUrl(webHost: string): string | undefined {
	try {
		const mapped = ENCATCH_FORM_API_BASE_URL[new URL(webHost).hostname];
		if (mapped) {
			return mapped;
		}
	} catch {
		// Invalid URL — fall through to origin override below.
	}
	return webHost;
}

export type InitEncatchResult =
	| { status: "initialized"; host: string; hostLabel: string }
	| { status: "already_initialized"; host: string; hostLabel: string }
	| { status: "skipped"; reason: "no_api_key" | "ssr"; message: string };

/** Default feedback form ID 1 from localStorage. Use when opening feedback. */
export function getEncatchFeedbackFormId1(): string {
	return getStored(ENCATCH_STORAGE_KEYS.FEEDBACK_FORM_ID_1).trim();
}

/** Default feedback form ID 2 from localStorage. */
export function getEncatchFeedbackFormId2(): string {
	return getStored(ENCATCH_STORAGE_KEYS.FEEDBACK_FORM_ID_2).trim();
}

/** Re-export SDK for direct usage. */
export { _encatch };

/**
 * Session recording controls implemented by the remote Encatch script (`/s/sdk/v1/encatch.js`).
 * They are attached to the SDK stub after load and are not listed on the published EncatchSDK typedef yet.
 */
export type EncatchSessionRecordingApi = {
	pauseSession: () => void;
	resumeSession: () => void;
	stopSession: () => void;
};

function getEncatchSessionRecording(): Partial<EncatchSessionRecordingApi> {
	return _encatch as typeof _encatch & Partial<EncatchSessionRecordingApi>;
}

function callEncatchSessionRecording(name: keyof EncatchSessionRecordingApi): void {
	const fn = getEncatchSessionRecording()[name];
	if (typeof fn !== "function") {
		throw new Error(`${String(name)} is not available yet. Wait for the Encatch SDK script to finish loading (after init), then try again.`);
	}
	fn();
}

/** Pause session recording (ping / URL tracking behavior per remote SDK). */
export function encatchPauseSession(): void {
	callEncatchSessionRecording("pauseSession");
}

/** Resume session recording after pauseSession(). */
export function encatchResumeSession(): void {
	callEncatchSessionRecording("resumeSession");
}

/** Stop the current session per remote SDK (distinct from resetUser / clearAll). */
export function encatchStopSession(): void {
	callEncatchSessionRecording("stopSession");
}

/**
 * Map legacy trait keys to @encatch/web-sdk UserTraits format.
 * Use when you have traits as { $set, $set_once, $counter, $unset } and need to pass to _encatch.identifyUser.
 */
export function mapTraitsToSdk(traits: Record<string, unknown> | undefined): UserTraits | undefined {
	if (!traits || typeof traits !== "object") return undefined;
	const out: UserTraits = {};
	if (traits.$set && typeof traits.$set === "object") out.$set = traits.$set as Record<string, unknown>;
	if (traits.$set_once && typeof traits.$set_once === "object") out.$setOnce = traits.$set_once as Record<string, unknown>;
	if (traits.$setOnce && typeof traits.$setOnce === "object") out.$setOnce = traits.$setOnce as Record<string, unknown>;
	if (traits.$counter && typeof traits.$counter === "object") {
		out.$increment = Object.fromEntries(Object.entries(traits.$counter as Record<string, number>).map(([k, v]) => [k, Number(v)])) as Record<string, number>;
	}
	if (Array.isArray(traits.$unset)) out.$unset = traits.$unset as string[];
	if (traits.$increment && typeof traits.$increment === "object") out.$increment = traits.$increment as Record<string, number>;
	if (traits.$decrement && typeof traits.$decrement === "object") out.$decrement = traits.$decrement as Record<string, number>;
	// Flat object → $set
	if (Object.keys(out).length === 0 && Object.keys(traits).length > 0 && !traits.$set && !traits.$set_once && !traits.$counter) {
		out.$set = traits as Record<string, unknown>;
	}
	return Object.keys(out).length ? out : undefined;
}

/**
 * Initialize the Encatch SDK. Call once when the app mounts (browser only).
 * Uses API key from localStorage for the selected host.
 * @param force — if true, bypasses the _initialized check and re-inits with the current config.
 */
export function initEncatch(force = false): InitEncatchResult {
	if (typeof window === "undefined") {
		return { status: "skipped", reason: "ssr", message: "Not in browser." };
	}
	const encatchOrigin = getEncatchInitOrigin();
	const hostLabel = getEncatchHostLabel(encatchOrigin);
	if (_encatch._initialized && !force) {
		return { status: "already_initialized", host: encatchOrigin, hostLabel };
	}
	const apiKey = getEncatchApiKey();
	if (!apiKey) {
		const message = `[Encatch] API key is not set for ${hostLabel}. Set it in Encatch config.`;
		console.warn(message);
		return { status: "skipped", reason: "no_api_key", message };
	}
	const encatchConfig: EncatchConfig = {
		webHost: encatchOrigin,
		theme: "system",
	};
	const apiBaseUrl = getEncatchApiBaseUrl(encatchOrigin);
	if (apiBaseUrl) {
		encatchConfig.apiBaseUrl = apiBaseUrl;
	}
	// Force reinit: reset internal state so init() runs fresh
	if (force && _encatch._initialized) {
		_encatch._initialized = false;
		_encatch._apiKey = null;
		_encatch._q = [];
	}
	_encatch.init(apiKey, encatchConfig);
	return { status: "initialized", host: encatchOrigin, hostLabel };
}
