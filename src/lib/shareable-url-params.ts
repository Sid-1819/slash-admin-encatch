/** Context variable type annotation for context_<name>[type] params. */
export type ContextParamType = "string" | "boolean" | "number";

/** Reserved contact_ parameter (not a custom trait slug). */
export type ContactField = "id" | "email" | "signature" | "signature_time" | "trait";

export type ParamKind = "response" | "context" | "contact";

export type ParamEntry =
	| {
			kind: "response";
			slug: string;
			value: string;
			member?: string;
			mode?: "set" | "append";
	  }
	| {
			kind: "context";
			name: string;
			value: string;
			type?: ContextParamType;
			mode?: "set" | "append";
	  }
	| {
			kind: "contact";
			field: ContactField;
			/** Trait slug without contact_ prefix when field is trait. */
			traitSlug?: string;
			value: string;
			mode?: "set" | "append";
	  };

export type BuildUrlOptions = {
	/** @deprecated URLSearchParams always percent-encodes brackets; literal and encoded forms are equivalent per doc. */
	encodeBrackets?: boolean;
};

function responseParamKey(slug: string, member?: string): string {
	const base = `response_${slug}`;
	if (!member) return base;
	return `${base}[${member}]`;
}

function contextParamKey(name: string, type?: ContextParamType): string {
	if (!type) return `context_${name}`;
	return `context_${name}[${type}]`;
}

function contactParamKey(field: ContactField, traitSlug?: string): string {
	switch (field) {
		case "id":
			return "contact_id";
		case "email":
			return "contact_email";
		case "signature":
			return "contact_signature";
		case "signature_time":
			return "contact_signature_time";
		case "trait":
			return `contact_${traitSlug ?? ""}`;
	}
}

export function buildResponseParam(slug: string, value: string): ParamEntry {
	return { kind: "response", slug, value, mode: "set" };
}

export function buildResponseMemberParam(slug: string, member: string, value: string): ParamEntry {
	return { kind: "response", slug, member, value, mode: "set" };
}

/** Repeat the same bracketed row key (matrix multiple per row). */
export function buildResponseMemberMultiParam(slug: string, member: string, value: string): ParamEntry {
	return { kind: "response", slug, member, value, mode: "append" };
}

export function buildResponseMultiParam(slug: string, value: string): ParamEntry {
	return { kind: "response", slug, value, mode: "append" };
}

export function buildContextParam(name: string, value: string, type?: ContextParamType): ParamEntry {
	return { kind: "context", name, value, type, mode: "set" };
}

/** Repeat the same context key (invalid per doc — entire variable ignored). */
export function buildContextMultiParam(name: string, value: string, type?: ContextParamType): ParamEntry {
	return { kind: "context", name, value, type, mode: "append" };
}

export function buildContactIdParam(value: string): ParamEntry {
	return { kind: "contact", field: "id", value, mode: "set" };
}

export function buildContactEmailParam(value: string): ParamEntry {
	return { kind: "contact", field: "email", value, mode: "set" };
}

export function buildContactTraitParam(traitSlug: string, value: string): ParamEntry {
	return { kind: "contact", field: "trait", traitSlug, value, mode: "set" };
}

export function buildContactSignatureParam(value: string): ParamEntry {
	return { kind: "contact", field: "signature", value, mode: "set" };
}

export function buildContactSignatureTimeParam(value: string): ParamEntry {
	return { kind: "contact", field: "signature_time", value, mode: "set" };
}

/** Repeat the same contact key (invalid per doc — param ignored). */
export function buildContactMultiParam(field: ContactField, value: string, traitSlug?: string): ParamEntry {
	return { kind: "contact", field, traitSlug, value, mode: "append" };
}

/** Serialize one param entry to key=value (without leading ?). */
export function serializeParamEntry(entry: ParamEntry): { key: string; value: string } {
	if (entry.kind === "response") {
		return {
			key: responseParamKey(entry.slug, entry.member),
			value: entry.value,
		};
	}
	if (entry.kind === "contact") {
		return {
			key: contactParamKey(entry.field, entry.traitSlug),
			value: entry.value,
		};
	}
	return {
		key: contextParamKey(entry.name, entry.type),
		value: entry.value,
	};
}

/** Apply param entries to a base shareable URL using URLSearchParams semantics. */
export function appendParams(baseUrl: string, entries: ParamEntry[]): string {
	const url = new URL(baseUrl);
	for (const entry of entries) {
		const { key, value } = serializeParamEntry(entry);
		if (entry.mode === "append") {
			url.searchParams.append(key, value);
		} else {
			url.searchParams.set(key, value);
		}
	}
	return url.toString();
}

/** Build query string only (no base URL). */
export function buildQueryString(entries: ParamEntry[]): string {
	const url = new URL("https://example.com/");
	const built = appendParams(url.toString(), entries);
	return built.slice(built.indexOf("?") + 1);
}
