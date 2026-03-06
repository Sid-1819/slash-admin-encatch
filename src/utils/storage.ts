import type { StorageEnum } from "#/enum";

export const getItem = <T>(key: StorageEnum): T | null => {
	let value = null;
	try {
		const result = window.localStorage.getItem(key);
		if (result) {
			value = JSON.parse(result);
		}
	} catch (error) {
		console.error(error);
	}
	return value;
};

export const getStringItem = (key: StorageEnum): string | null => {
	return localStorage.getItem(key);
};

export const setItem = <T>(key: StorageEnum, value: T): void => {
	localStorage.setItem(key, JSON.stringify(value));
};
export const removeItem = (key: StorageEnum): void => {
	localStorage.removeItem(key);
};
export const clearItems = () => {
	localStorage.clear();
};

/**
 * Clear all client-side storage on logout: localStorage, sessionStorage,
 * cookies (non-HttpOnly only), and IndexedDB databases.
 */
export function clearAllStorageOnLogout(): void {
	try {
		if (typeof localStorage !== "undefined") localStorage.clear();
		if (typeof sessionStorage !== "undefined") sessionStorage.clear();
	} catch {
		// ignore
	}

	// Clear cookies (only non-HttpOnly; server-side cookies are not accessible)
	try {
		const cookies = document.cookie.split("; ");
		for (const cookie of cookies) {
			const eq = cookie.indexOf("=");
			const name = eq > -1 ? cookie.slice(0, eq).trim() : cookie.trim();
			if (name) {
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
			}
		}
	} catch {
		// ignore
	}

	// Clear IndexedDB (async; fire-and-forget)
	try {
		if (typeof indexedDB !== "undefined") {
			const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name: string }[]> };
			if (typeof idb.databases === "function") {
				idb
					.databases()
					.then((dbs) => {
						for (const db of dbs) {
							if (db.name) indexedDB.deleteDatabase(db.name);
						}
					})
					.catch(() => {});
			}
		}
	} catch {
		// ignore
	}
}
