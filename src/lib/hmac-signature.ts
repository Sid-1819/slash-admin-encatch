/**
 * HMAC-SHA256 signatures for Encatch identity verification.
 *
 * Matches core-backend ApiValidationUseCase and shareable contact_signature docs:
 * - Without session timeout: HMAC-SHA256(identifier, secretKey)
 * - With session timeout: HMAC-SHA256(identifier + epochMs, secretKey)
 */
export async function generateHmacSha256Hex(
	identifier: string,
	secretKey: string,
	timestampMs?: string,
): Promise<string> {
	const message = timestampMs ? `${identifier}${timestampMs}` : identifier;
	const enc = new TextEncoder();
	const keyBytes = enc.encode(secretKey);
	const messageBytes = enc.encode(message);
	const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes);
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export function buildShareableSignedUrl(
	baseUrl: string,
	contactId: string,
	signature: string,
	timestampMs?: string,
): string {
	const url = new URL(baseUrl.trim());
	url.searchParams.set("contact_id", contactId);
	url.searchParams.set("contact_signature", signature);
	if (timestampMs) {
		url.searchParams.set("contact_signature_time", timestampMs);
	}
	return url.toString();
}
