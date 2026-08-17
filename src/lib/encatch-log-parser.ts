export type EncatchLogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "TRACE" | "RAW";

export type EncatchLogEntry = {
	id: number;
	raw: Record<string, unknown>;
	timestamp: string | null;
	message: string | null;
	traceId: string | null;
	spanId: string | null;
	target: string | null;
	lineNumber: number | null;
	level: EncatchLogLevel;
	path: string | null;
	status: string | null;
	service: string | null;
	error: string | null;
};

export type EncatchLogParseResult = {
	entries: EncatchLogEntry[];
	errors: { line: number; text: string; error: string }[];
	skipped: { line: number; text: string }[];
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractFields(raw: Record<string, unknown>): Record<string, unknown> | null {
	const fields = raw.fields;
	return fields && typeof fields === "object" && !Array.isArray(fields) ? (fields as Record<string, unknown>) : null;
}

function extractPath(raw: Record<string, unknown>): string | null {
	const span = raw.span;
	if (span && typeof span === "object" && !Array.isArray(span)) {
		const name = readString((span as Record<string, unknown>).name);
		if (name) return name;
	}

	const spans = raw.spans;
	if (!Array.isArray(spans)) return null;

	for (const item of spans) {
		if (!item || typeof item !== "object") continue;
		const spanRecord = item as Record<string, unknown>;
		const path = readString(spanRecord["url.path"]) ?? readString(spanRecord["http.route"]);
		if (path) return path;
	}

	return null;
}

function extractStatus(raw: Record<string, unknown>, fields: Record<string, unknown> | null): string | null {
	const fromFields = readString(fields?.status) ?? readString(fields?.http_status) ?? readString(fields?.status_code);
	if (fromFields) return fromFields;

	const spans = raw.spans;
	if (!Array.isArray(spans)) return null;

	for (const item of spans) {
		if (!item || typeof item !== "object") continue;
		const spanRecord = item as Record<string, unknown>;
		const status = readString(spanRecord["http.response.status_code"]);
		if (status) return status;
	}

	return null;
}

function extractService(raw: Record<string, unknown>, target: string | null): string | null {
	const spans = raw.spans;
	if (Array.isArray(spans)) {
		for (const item of spans) {
			if (!item || typeof item !== "object") continue;
			const address = readString((item as Record<string, unknown>)["server.address"]);
			if (address) return address.split(":")[0] ?? address;
		}
	}

	if (target) {
		const parts = target.split("::");
		return parts[parts.length - 1] ?? target;
	}

	return null;
}

function extractError(fields: Record<string, unknown> | null, message: string | null): string | null {
	const explicit =
		readString(fields?.error) ??
		readString(fields?.exception) ??
		readString(fields?.err) ??
		readString(fields?.error_message);
	if (explicit) return explicit;

	if (message && /\berror\b|\bfailed\b|\bfailure\b/i.test(message)) {
		return message;
	}

	return null;
}

function inferLevel(message: string | null, fields: Record<string, unknown> | null, hasTimestamp: boolean): EncatchLogLevel {
	const explicit = readString(fields?.level);
	if (explicit) return explicit.toUpperCase() as EncatchLogLevel;

	const msg = (message ?? "").toLowerCase();
	if (msg.includes("error") || msg.includes("failed") || msg.includes("failure")) return "ERROR";
	if (msg.includes("warn")) return "WARN";
	if (msg.includes("debug")) return "DEBUG";
	if (msg.includes("trace")) return "TRACE";
	if (!hasTimestamp && !fields?.trace_id) return "RAW";
	return "INFO";
}

function extractJsonCandidate(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed) return null;

	const start = trimmed.indexOf("{");
	if (start === -1) return null;

	return trimmed.slice(start);
}

function parseBalancedJsonObject(text: string): Record<string, unknown> | null {
	const start = text.indexOf("{");
	if (start === -1) return null;

	let depth = 0;
	let inString = false;
	let escape = false;

	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escape) escape = false;
			else if (ch === "\\") escape = true;
			else if (ch === '"') inString = false;
			continue;
		}

		if (ch === '"') {
			inString = true;
			continue;
		}

		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) {
				try {
					const parsed: unknown = JSON.parse(text.slice(start, i + 1));
					if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
						return parsed as Record<string, unknown>;
					}
				} catch {
					return null;
				}
			}
		}
	}

	return null;
}

function parseLogObject(line: string): Record<string, unknown> | null {
	const candidate = extractJsonCandidate(line);
	if (!candidate) return null;

	try {
		const parsed: unknown = JSON.parse(candidate);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return parseBalancedJsonObject(candidate);
	}

	return null;
}

function buildEntry(raw: Record<string, unknown>, entryId: number): EncatchLogEntry {
	const fields = extractFields(raw);
	const timestamp = readString(raw.timestamp);
	const message = readString(fields?.message);
	const target = readString(raw.target);

	return {
		id: entryId,
		raw,
		timestamp,
		message,
		traceId: readString(fields?.trace_id),
		spanId: readString(fields?.span_id),
		target,
		lineNumber: readNumber(raw.line_number),
		level: inferLevel(message, fields, Boolean(timestamp)),
		path: extractPath(raw),
		status: extractStatus(raw, fields),
		service: extractService(raw, target),
		error: extractError(fields, message),
	};
}

export function parseEncatchLogText(input: string): EncatchLogParseResult {
	const lines = input.split(/\r?\n/);
	const entries: EncatchLogEntry[] = [];
	const errors: EncatchLogParseResult["errors"] = [];
	const skipped: EncatchLogParseResult["skipped"] = [];
	let entryId = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line) continue;

		const candidate = extractJsonCandidate(line);
		if (!candidate) {
			skipped.push({ line: i + 1, text: line.slice(0, 120) });
			continue;
		}

		const raw = parseLogObject(line);
		if (!raw) {
			errors.push({
				line: i + 1,
				text: line.slice(0, 120),
				error: "Could not parse JSON log object on this line.",
			});
			continue;
		}

		entries.push(buildEntry(raw, entryId++));
	}

	return { entries, errors, skipped };
}

export function formatLogUtcTimestamp(timestamp: string | null): string {
	if (!timestamp) return "—";
	return timestamp;
}

export function formatLogIstTimestamp(timestamp: string | null): string {
	if (!timestamp) return "—";
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return "Invalid timestamp";

	const parts = new Intl.DateTimeFormat("en-IN", {
		timeZone: "Asia/Kolkata",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		fractionalSecondDigits: 3,
		hour12: false,
	}).formatToParts(date);

	const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

	return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}.${get("fractionalSecond")} IST`;
}

export function formatLogTableTimestamp(timestamp: string | null): string {
	if (!timestamp) return "—";
	return formatLogIstTimestamp(timestamp).replace(" IST", "");
}

export function formatLogJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

export function truncateText(value: string | null, max = 80): string {
	if (!value) return "—";
	if (value.length <= max) return value;
	return `${value.slice(0, max)}…`;
}

export const LOG_LEVELS: EncatchLogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG", "TRACE", "RAW"];

export function countByLevel(entries: EncatchLogEntry[]): Record<EncatchLogLevel | "TOTAL", number> {
	const counts: Record<EncatchLogLevel | "TOTAL", number> = {
		TOTAL: entries.length,
		INFO: 0,
		WARN: 0,
		ERROR: 0,
		DEBUG: 0,
		TRACE: 0,
		RAW: 0,
	};

	for (const entry of entries) {
		counts[entry.level] += 1;
	}

	return counts;
}
