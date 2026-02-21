/**
 * Encatch Web SDK integration for Slash Admin.
 * Uses @encatch/web-sdk directly; no adapter. Call _encatch methods after initEncatch().
 */

import { _encatch } from "@encatch/web-sdk";
import type { UserTraits } from "@encatch/web-sdk";

const API_KEY = import.meta.env.VITE_ENCATCH_SDK_API_KEY;

/** Default feedback form ID (from env or fallback). Use when opening feedback. */
export const ENCATCH_FEEDBACK_FORM_ID = import.meta.env.VITE_ENCATCH_FEEDBACK_FORM_ID;

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
 */
export function initEncatch(): void {
	if (typeof window === "undefined") return;
	if (_encatch._initialized) return;
	const apiKey = API_KEY?.trim();
	if (!apiKey) {
		console.warn("[Encatch] API key is not set. Encatch SDK will not be initialized.");
		return;
	}
	const origin = window.location.origin;
	const apiBaseUrl = origin;
	_encatch.init(apiKey, {
		webHost: origin,
		apiBaseUrl,
		theme: "system",
	});
}
