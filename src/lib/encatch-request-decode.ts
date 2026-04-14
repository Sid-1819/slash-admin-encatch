import { decodeEncatchResponseNode } from "@/lib/encatch-response-decode";

export type EncatchDateRangeItv = {
	start: string;
	end: string;
};

export type EncatchRequestEnvelope = {
	t: unknown;
	f: unknown;
	m: unknown;
};

export type EncatchRequestDecoded = {
	decoded: unknown;
	/** Frame / flags from the wire envelope (when present). */
	f?: number;
	/** Meta list from the wire envelope (when present). */
	m?: unknown[];
	/** Parsed intervals derived from decoded payloads (e.g. `dateRange`). */
	itv?: {
		dateRange?: EncatchDateRangeItv;
	};
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWireNode(value: unknown): boolean {
	if (!isPlainObject(value)) return false;
	const t = value.t;
	return typeof t === "number";
}

/**
 * Request bodies sometimes arrive as `{ t: <wire node>, f, m }` where `t` is the root
 * wire object (not a scalar type tag).
 */
export function isEncatchRequestEnvelope(value: unknown): value is EncatchRequestEnvelope {
	if (!isPlainObject(value)) return false;
	if (!("t" in value) || !("f" in value) || !("m" in value)) return false;
	return isWireNode(value.t);
}

/**
 * Split Encatch `dateRange` strings shaped like `2026-04-06T18:30:00Z-2026-04-14T09:14:00Z`
 * (two UTC ISO instants joined by `Z-`).
 */
export function parseDateRangeToItv(dateRange: string): EncatchDateRangeItv | undefined {
	const trimmed = dateRange.trim();
	if (!trimmed) return undefined;
	const idx = trimmed.indexOf("Z-");
	if (idx === -1) return undefined;
	const start = `${trimmed.slice(0, idx)}Z`;
	const end = trimmed.slice(idx + 2);
	if (!start || !end) return undefined;
	return { start, end };
}

function readDateRangeFromTree(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (!isPlainObject(value)) return undefined;
	if (typeof value.dateRange === "string") return value.dateRange;
	if ("data" in value) return readDateRangeFromTree(value.data);
	return undefined;
}

function buildItv(decoded: unknown): EncatchRequestDecoded["itv"] {
	const raw = readDateRangeFromTree(decoded);
	if (!raw) return undefined;
	const dateRange = parseDateRangeToItv(raw);
	if (!dateRange) return undefined;
	return { dateRange };
}

/**
 * Decode a wire-format Encatch **request** payload, including optional `{ t, f, m }` envelope,
 * and attach `itv` when a `dateRange` interval can be parsed.
 */
export function decodeEncatchRequestJson(input: unknown): EncatchRequestDecoded {
	if (isEncatchRequestEnvelope(input)) {
		const decoded = decodeEncatchResponseNode(input.t);
		const itv = buildItv(decoded);
		const fNum = typeof input.f === "number" ? input.f : Number(input.f);
		const out: EncatchRequestDecoded = {
			decoded,
			...(Number.isFinite(fNum) ? { f: fNum } : {}),
			m: Array.isArray(input.m) ? input.m : [],
		};
		if (itv && Object.keys(itv).length > 0) {
			out.itv = itv;
		}
		return out;
	}

	const decoded = decodeEncatchResponseNode(input);
	const itv = buildItv(decoded);
	const out: EncatchRequestDecoded = { decoded };
	if (itv && Object.keys(itv).length > 0) {
		out.itv = itv;
	}
	return out;
}
