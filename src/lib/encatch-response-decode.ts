/**
 * Decodes Encatch wire-format JSON nodes (objects with `t`, `p`/`a`/`s`) into plain JSON values.
 * Mirrors the standalone HTML decoder used for API responses.
 */
export function decodeEncatchResponseNode(node: unknown): unknown {
	if (typeof node !== "object" || node === null) return node;
	const n = node as {
		t?: number;
		p?: { k?: string[]; v?: unknown[] };
		a?: unknown[];
		s?: unknown;
	};
	const t = n.t;

	if (t === 10 && n.p) {
		const keys = n.p.k ?? [];
		const values = n.p.v ?? [];
		const obj: Record<string, unknown> = {};
		keys.forEach((k, i) => {
			obj[k] = decodeEncatchResponseNode(values[i]);
		});
		return obj;
	}

	if (t === 9 && Array.isArray(n.a)) {
		return n.a.map((item) => decodeEncatchResponseNode(item));
	}

	// Typed scalars: 0 = number, 1 = string, 2 = boolean (see Encatch wire requests)
	if (typeof t === "number" && "s" in n) {
		if (t === 0) {
			return typeof n.s === "number" ? n.s : Number(n.s);
		}
		if (t === 1) {
			return String(n.s);
		}
		if (t === 2) {
			return n.s === 1 || n.s === true;
		}
	}

	if ("s" in n) {
		return n.s;
	}

	return node;
}
