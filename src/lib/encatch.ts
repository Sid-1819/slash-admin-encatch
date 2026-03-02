/**
 * Encatch Web SDK integration for Slash Admin.
 * Uses @encatch/web-sdk directly; no adapter. Call _encatch methods after initEncatch().
 * API key and feedback form IDs are read from localStorage (set on the login screen).
 */

import { _encatch } from "@encatch/web-sdk";
import type { UserTraits } from "@encatch/web-sdk";

/** localStorage keys for Encatch config (set on login screen). */
export const ENCATCH_STORAGE_KEYS = {
	API_KEY: "encatch_api_key",
	HOST: "encatch_host",
	FEEDBACK_FORM_ID_1: "encatch_feedback_form_id_1",
	FEEDBACK_FORM_ID_2: "encatch_feedback_form_id_2",
} as const;

/** Default Encatch host when none is configured (UAT). */
export const ENCATCH_DEFAULT_HOST = "https://app.uat.encatch.com";

/** Dropdown options for Encatch host on the login panel. */
export const ENCATCH_HOST_OPTIONS = [
	{ value: "https://app.dev.encatch.com", label: "app.dev.encatch.com" },
	{ value: "https://app.uat.encatch.com", label: "app.uat.encatch.com" },
	{ value: "https://app.encatch.com", label: "app.encatch.com" },
] as const;

function getStored(key: string): string {
	if (typeof window === "undefined" || typeof localStorage === "undefined") return "";
	try {
		return localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

/** API key from localStorage (set on login screen). */
export function getEncatchApiKey(): string {
	return getStored(ENCATCH_STORAGE_KEYS.API_KEY).trim();
}

/** Host (e.g. https://app.dev.encatch.com) from localStorage. Empty means use default. */
export function getEncatchHost(): string {
	const stored = getStored(ENCATCH_STORAGE_KEYS.HOST).trim();
	return stored || ENCATCH_DEFAULT_HOST;
}

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
 * Uses API key from localStorage (set on login screen).
 */
export function initEncatch(): void {
	if (typeof window === "undefined") return;
	if (_encatch._initialized) return;
	const apiKey = getEncatchApiKey();
	if (!apiKey) {
		console.warn("[Encatch] API key is not set. Set it on the login screen to enable Encatch.");
		return;
	}
	const isProd = import.meta.env.PROD;
	const storedHost = getStored(ENCATCH_STORAGE_KEYS.HOST).trim();
	const encatchOrigin = storedHost || (isProd ? ENCATCH_DEFAULT_HOST : window.location.origin);
	_encatch.init(apiKey, {
		webHost: encatchOrigin,
		apiBaseUrl: encatchOrigin,
		theme: "system",
	});
}
