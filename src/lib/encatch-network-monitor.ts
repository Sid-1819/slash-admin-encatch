/**
 * Logs Encatch API fetch/XHR calls for the test harness (DevTools Network + on-page log).
 * Does not show toasts — real HTTP traffic only.
 */

export type EncatchNetworkLogEntry = {
	method: string;
	url: string;
	status: number;
	statusText: string;
	at: string;
};

function getRequestUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.href;
	if (input instanceof Request) return input.url;
	return String(input);
}

/** Match Encatch API paths on any host (proxy, api.*, form.*). */
export function isEncatchNetworkUrl(url: string): boolean {
	try {
		const resolved = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
		if (/encatch\.com/i.test(resolved.hostname)) return true;
		return /\/encatch\//i.test(resolved.pathname) || /engage-product\/encatch/i.test(resolved.href);
	} catch {
		return /encatch/i.test(url);
	}
}

let monitorInstalled = false;

export function installEncatchNetworkMonitor(onEntry?: (entry: EncatchNetworkLogEntry) => void): () => void {
	if (typeof window === "undefined" || monitorInstalled) {
		return () => {};
	}
	monitorInstalled = true;

	const log = (method: string, url: string, status: number, statusText: string) => {
		if (!isEncatchNetworkUrl(url)) return;
		const entry: EncatchNetworkLogEntry = {
			method: method.toUpperCase(),
			url,
			status,
			statusText,
			at: new Date().toISOString(),
		};
		if (import.meta.env.DEV) {
			console.debug("[Encatch Network]", entry.method, entry.status, entry.url);
		}
		window.dispatchEvent(new CustomEvent("encatch:network", { detail: entry }));
		onEntry?.(entry);
	};

	const originalFetch = window.fetch.bind(window);
	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = getRequestUrl(input);
		const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
		try {
			const response = await originalFetch(input, init);
			if (isEncatchNetworkUrl(url)) {
				log(method, url, response.status, response.statusText);
			}
			return response;
		} catch (error) {
			if (isEncatchNetworkUrl(url)) {
				log(method, url, 0, error instanceof Error ? error.message : "Network error");
			}
			throw error;
		}
	};

	const originalXhrOpen = XMLHttpRequest.prototype.open;
	const originalXhrSend = XMLHttpRequest.prototype.send;

	XMLHttpRequest.prototype.open = function (
		method: string,
		url: string | URL,
		async?: boolean,
		username?: string | null,
		password?: string | null,
	) {
		(this as XMLHttpRequest & { _encatchMethod?: string; _encatchUrl?: string })._encatchMethod = method;
		(this as XMLHttpRequest & { _encatchMethod?: string; _encatchUrl?: string })._encatchUrl =
			typeof url === "string" ? url : url.toString();
		return originalXhrOpen.call(this, method, url, async ?? true, username, password);
	};

	XMLHttpRequest.prototype.send = function (...args: Parameters<XMLHttpRequest["send"]>) {
		const xhr = this as XMLHttpRequest & { _encatchMethod?: string; _encatchUrl?: string };
		const method = xhr._encatchMethod ?? "GET";
		const url = xhr._encatchUrl ?? "";

		const onDone = () => {
			xhr.removeEventListener("loadend", onDone);
			log(method, url, xhr.status, xhr.statusText || "OK");
		};

		if (isEncatchNetworkUrl(url)) {
			xhr.addEventListener("loadend", onDone);
		}

		return originalXhrSend.apply(this, args);
	};

	return () => {
		window.fetch = originalFetch;
		XMLHttpRequest.prototype.open = originalXhrOpen;
		XMLHttpRequest.prototype.send = originalXhrSend;
		monitorInstalled = false;
	};
}
