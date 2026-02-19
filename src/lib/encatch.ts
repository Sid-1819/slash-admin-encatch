/**
 * Encatch Web SDK integration for Slash Admin.
 * Uses @encatch/web-sdk and exposes a window.encatch adapter for backward
 * compatibility with existing call sites (trackEvent, identify, openFeedbackById, etc.).
 */

import { _encatch } from "@encatch/web-sdk";
import type { UserTraits } from "@encatch/web-sdk";

const API_KEY = "en_dev_RnZNuDSmCeGDz6TflPFMhGYBl1nbY5tYObyG6ZLNlFQnAuX80QDvrAyuypPSDJRNnTcwtqD_5fd0b5a3";

/** Default feedback form ID (from env or fallback). Use when opening feedback on button click. */
export const ENCATCH_FEEDBACK_FORM_ID = "8c6893be-8189-4d03-bb73-e0488670fc4e";

/**
 * Map legacy trait keys to @encatch/web-sdk UserTraits format.
 * Legacy: $set, $set_once, $counter, $unset → New: $set, $setOnce, $increment, $unset
 */
function mapTraitsToSdk(traits: Record<string, unknown> | undefined): UserTraits | undefined {
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
 * Create the window.encatch adapter that maps legacy API to @encatch/web-sdk.
 */
function createEncatchAdapter() {
	return {
		_i: [] as unknown[],
		apiKey: _encatch._apiKey ?? "",
		config: _encatch._config as Record<string, unknown>,
		chunkUrlLoader: (_url: string) => _url,

		init: () => {
			// SDK is initialized in initEncatch(); no-op here for type compatibility
		},

		trackEvent(eventName: string, _properties?: Record<string, unknown>) {
			_encatch.trackEvent(eventName);
		},

		identify(userId: string, traits?: Record<string, unknown>) {
			const sdkTraits = mapTraitsToSdk(traits);
			_encatch.identifyUser(userId, sdkTraits);
		},

		setThemeMode(theme: "light" | "dark") {
			_encatch.setTheme(theme);
		},

		setLanguage(language: string) {
			_encatch.setLocale(language);
		},

		openFeedbackById(feedbackConfigurationId: string) {
			_encatch.showForm(feedbackConfigurationId);
		},

		openFeedbackByName(_feedbackConfigurationName: string) {
			console.warn("[Encatch] openFeedbackByName is not supported by @encatch/web-sdk. Use openFeedbackById with the feedback configuration ID.");
		},

		verifyFeedbackIds(_feedbackConfigurationIds: string[]): string[] {
			return [];
		},

		async forceFetchEligibleFeedbacks(): Promise<void> {
			// No-op in @encatch/web-sdk
		},

		capturePageScrollEvent(scrollPercent: string) {
			_encatch.trackEvent(`page_scroll_${scrollPercent}`);
		},

		_internal: {} as EncatchGlobal["_internal"],
	};
}

/**
 * Initialize the Encatch SDK and attach the window.encatch adapter.
 * Call once when the app mounts (browser only).
 */
export function initEncatch(): void {
	if (typeof window === "undefined") return;
	if (_encatch._initialized) {
		(window as Window & { encatch?: unknown }).encatch = createEncatchAdapter();
		return;
	}
	const apiKey = API_KEY?.trim();
	if (!apiKey) {
		console.warn("[Encatch] VITE_ENCATCH_API_KEY is not set. Encatch SDK will not be initialized.");
		(window as Window & { encatch?: unknown }).encatch = createEncatchAdapter();
		return;
	}
	// Use same origin so Vite proxy serves script (avoids CORS); API goes through proxy unless overridden
	const origin = window.location.origin;
	const apiBaseUrl = (typeof import.meta.env?.VITE_ENCATCH_API_BASE_URL === "string" && import.meta.env.VITE_ENCATCH_API_BASE_URL.trim()) || origin;
	_encatch.init(apiKey, {
		webHost: origin,
		apiBaseUrl,
		theme: "system",
	});
	(window as Window & { encatch?: unknown }).encatch = createEncatchAdapter();
}
