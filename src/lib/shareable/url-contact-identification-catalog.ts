/**
 * Contact_ values aligned with project User Traits (admin → User Data → User Traits).
 * @see https://dev.encatch.com/docs/shareable-feedback/user-identification
 *
 * Writable text traits used in presets: user_name, display_name.
 * Identity email uses reserved contact_email (maps to email trait on submit).
 *
 * Do not use system/datetime/counter traits in URL presets (first_seen_at, feedback_views_count, …).
 */

export const URL_CONTACT_IDENTIFICATION_DOC =
	"https://dev.encatch.com/docs/shareable-feedback/user-identification";

/** Reserved contact_ keys (not custom trait slugs). */
export const URL_CONTACT_RESERVED_KEYS = {
	id: "contact_id",
	email: "contact_email",
	signature: "contact_signature",
	signatureTime: "contact_signature_time",
} as const;

/**
 * Traits present in automation/dev project (User Traits screen).
 * Use contact_<slug> in URLs — only lowercase slugs with letters, numbers, underscores.
 */
export const URL_CONTACT_PROJECT_TRAITS = {
	userName: { slug: "user_name", name: "Username", dataType: "Text" },
	displayName: { slug: "display_name", name: "Display Name", dataType: "Text" },
	email: { slug: "email", name: "Email", dataType: "Text" },
} as const;

/** Slugs used by preset cases (subset of project traits safe for contact_ URL testing). */
export const URL_CONTACT_TRAIT_SLUGS = {
	userName: URL_CONTACT_PROJECT_TRAITS.userName.slug,
	displayName: URL_CONTACT_PROJECT_TRAITS.displayName.slug,
} as const;

export const URL_CONTACT_PRESET_VALUES = {
	contactId: "customer_123",
	contactEmail: "alice@example.com",
	userName: "alice.demo",
	displayName: "Alice",
	displayNameEncoded: "Alice & Bob",
	invalidContactId: "customer with spaces",
	invalidTraitSlug: "Display-Name",
	invalidEmail: "not-an-email",
	placeholderSignature: "<server-generated-hmac-hex>",
	placeholderSignatureTime: "1710000000000",
} as const;

/**
 * Shareable URL harness does not create traits — it only builds links.
 * Traits are managed in admin (User Traits → Create Trait).
 * With "Allow new traits from clients" enabled, unknown slugs may be created on submit;
 * presets use existing slugs (user_name, display_name) for reliable tests.
 */
export const URL_CONTACT_TRAITS_NOTE =
	"Presets use project traits user_name and display_name. Create extra traits in admin if needed; contact_email sets email identity.";
