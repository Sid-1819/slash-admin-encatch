export type DeviceInfoTestValues = {
	deviceType: string;
	deviceOs: string;
	deviceOsVersion: string;
	browser: string;
	browserVersion: string;
};

export const ENCATCH_TEST_DEVICE_OVERRIDE_KEY = "encatch_test_device_override";

export const DEVICE_TYPE_OPTIONS = ["desktop", "tablet", "mobile"] as const;

export const DEVICE_OS_OPTIONS = ["Windows", "Mac OS", "iOS", "Android", "Linux", "Chrome OS"] as const;

export const BROWSER_OPTIONS = ["Chrome", "Safari", "Firefox", "Edge", "Opera", "Brave"] as const;

export const DEFAULT_DEVICE_INFO_TEST_VALUES: DeviceInfoTestValues = {
	deviceType: "desktop",
	deviceOs: "Windows",
	deviceOsVersion: "11",
	browser: "Chrome",
	browserVersion: "124.0",
};

/** In-memory cache so fetch patch sees saves immediately (no localStorage lag). */
let cachedTestValues: DeviceInfoTestValues | null = null;

function parseStoredOverride(raw: string): Partial<DeviceInfoTestValues> {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		const obj = parsed as Record<string, unknown>;
		const out: Partial<DeviceInfoTestValues> = {};
		if (typeof obj.deviceType === "string" && obj.deviceType.trim()) out.deviceType = obj.deviceType.trim();
		if (typeof obj.deviceOs === "string" && obj.deviceOs.trim()) out.deviceOs = obj.deviceOs.trim();
		if (typeof obj.deviceOsVersion === "string") out.deviceOsVersion = obj.deviceOsVersion.trim();
		if (typeof obj.browser === "string" && obj.browser.trim()) out.browser = obj.browser.trim();
		if (typeof obj.browserVersion === "string") out.browserVersion = obj.browserVersion.trim();
		return out;
	} catch {
		return {};
	}
}

/** Load manual test device values (never reads the real browser UA). */
export function loadDeviceInfoTestValues(): DeviceInfoTestValues {
	if (cachedTestValues) return { ...cachedTestValues };
	if (typeof localStorage === "undefined") return { ...DEFAULT_DEVICE_INFO_TEST_VALUES };
	try {
		const raw = localStorage.getItem(ENCATCH_TEST_DEVICE_OVERRIDE_KEY);
		if (!raw?.trim()) {
			cachedTestValues = { ...DEFAULT_DEVICE_INFO_TEST_VALUES };
			return { ...cachedTestValues };
		}
		cachedTestValues = { ...DEFAULT_DEVICE_INFO_TEST_VALUES, ...parseStoredOverride(raw) };
		return { ...cachedTestValues };
	} catch {
		cachedTestValues = { ...DEFAULT_DEVICE_INFO_TEST_VALUES };
		return { ...cachedTestValues };
	}
}

/** Persist manual values for the test page; used by the fetch patch on every Encatch API call. */
export function saveDeviceInfoTestValues(values: DeviceInfoTestValues): void {
	cachedTestValues = {
		deviceType: values.deviceType.trim() || DEFAULT_DEVICE_INFO_TEST_VALUES.deviceType,
		deviceOs: values.deviceOs.trim() || DEFAULT_DEVICE_INFO_TEST_VALUES.deviceOs,
		deviceOsVersion: values.deviceOsVersion.trim(),
		browser: values.browser.trim() || DEFAULT_DEVICE_INFO_TEST_VALUES.browser,
		browserVersion: values.browserVersion.trim(),
	};
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(
		ENCATCH_TEST_DEVICE_OVERRIDE_KEY,
		JSON.stringify({
			deviceType: cachedTestValues.deviceType,
			deviceOs: cachedTestValues.deviceOs,
			...(cachedTestValues.deviceOsVersion ? { deviceOsVersion: cachedTestValues.deviceOsVersion } : {}),
			browser: cachedTestValues.browser,
			...(cachedTestValues.browserVersion ? { browserVersion: cachedTestValues.browserVersion } : {}),
		}),
	);
}

export function clearDeviceInfoTestValues(): void {
	cachedTestValues = null;
	if (typeof localStorage !== "undefined") localStorage.removeItem(ENCATCH_TEST_DEVICE_OVERRIDE_KEY);
}

function buildApiDeviceInfoFromTestValues(values: DeviceInfoTestValues): Record<string, string> {
	const out: Record<string, string> = {
		$deviceType: values.deviceType,
		$deviceSize: values.deviceType,
		$deviceOs: values.deviceOs,
		$browser: values.browser,
		$app: values.browser,
	};
	if (values.deviceOsVersion.trim()) {
		out.$deviceOsVersion = values.deviceOsVersion.trim();
		out.$deviceVersion = values.deviceOsVersion.trim();
	}
	if (values.browserVersion.trim()) {
		out.$browserVersion = values.browserVersion.trim();
		out.$appVersion = values.browserVersion.trim();
	}
	return out;
}

function isEncatchApiUrl(url: string): boolean {
	return /\/encatch\//i.test(url) || /engage-product\/encatch/i.test(url);
}

function patchEncatchRequestBody(bodyText: string): string | null {
	try {
		const parsed = JSON.parse(bodyText) as Record<string, unknown>;
		if (!parsed || typeof parsed !== "object") return null;
		const deviceInfoKey = "$deviceInfo" in parsed ? "$deviceInfo" : "deviceInfo" in parsed ? "deviceInfo" : null;
		if (!deviceInfoKey) return null;

		const testDeviceInfo = buildApiDeviceInfoFromTestValues(loadDeviceInfoTestValues());
		const existing = typeof parsed[deviceInfoKey] === "object" && parsed[deviceInfoKey] !== null ? (parsed[deviceInfoKey] as Record<string, unknown>) : {};
		parsed[deviceInfoKey] = { ...existing, ...testDeviceInfo };
		return JSON.stringify(parsed);
	} catch {
		return null;
	}
}

function getFetchUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.href;
	if (input instanceof Request) return input.url;
	return String(input);
}

let fetchPatchInstalled = false;

/** Slash-admin test harness: replace $deviceInfo on Encatch API requests with manual test values. */
export function installEncatchDeviceInfoTestFetchPatch(): void {
	if (fetchPatchInstalled || typeof globalThis.fetch !== "function") return;
	fetchPatchInstalled = true;

	const originalFetch = globalThis.fetch.bind(globalThis);

	globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = getFetchUrl(input);
		if (!isEncatchApiUrl(url)) {
			return originalFetch(input, init);
		}

		try {
			if (input instanceof Request) {
				if (input.method === "GET" || input.method === "HEAD") {
					return originalFetch(input, init);
				}
				const bodyText = await input.clone().text();
				if (!bodyText) return originalFetch(input, init);
				const patchedBody = patchEncatchRequestBody(bodyText);
				if (!patchedBody) return originalFetch(input, init);

				const headers = new Headers(input.headers);
				if (!headers.has("Content-Type")) {
					headers.set("Content-Type", "application/json");
				}

				const nextRequest = new Request(input.url, {
					method: input.method,
					headers,
					body: patchedBody,
					credentials: input.credentials,
					mode: input.mode,
					redirect: input.redirect,
					referrer: input.referrer,
					referrerPolicy: input.referrerPolicy,
					integrity: input.integrity,
					keepalive: input.keepalive,
					signal: init?.signal ?? input.signal,
				});
				return originalFetch(nextRequest);
			}

			if (init?.body && typeof init.body === "string") {
				const patchedBody = patchEncatchRequestBody(init.body);
				if (patchedBody) {
					return originalFetch(input, { ...init, body: patchedBody });
				}
			}
		} catch {
			// fall through to original request
		}

		return originalFetch(input, init);
	};
}
