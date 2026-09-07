import type { ParamEntry } from "@/lib/shareable-url-params";
import {
	buildContactEmailParam,
	buildContactIdParam,
	buildContactMultiParam,
	buildContactSignatureParam,
	buildContactSignatureTimeParam,
	buildContactTraitParam,
	buildResponseParam,
} from "@/lib/shareable-url-params";

import { URL_PREFILL_FORM_SLUGS as S, URL_PREFILL_PRESET_VALUES as RV } from "@/lib/shareable/url-prefill-form-catalog";
import {
	URL_CONTACT_IDENTIFICATION_DOC,
	URL_CONTACT_PRESET_VALUES as V,
	URL_CONTACT_TRAITS_NOTE,
	URL_CONTACT_TRAIT_SLUGS as T,
} from "@/lib/shareable/url-contact-identification-catalog";

export type UrlContactDocSection =
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P";

export type UrlContactPresetCase = {
	id: string;
	section: UrlContactDocSection;
	name: string;
	description: string;
	docAnchor: string;
	params: ParamEntry[];
	uiChecklist: string[];
	irChecklist: string[];
};

export const URL_CONTACT_DOC_SECTION_LABELS: Record<UrlContactDocSection, string> = {
	J: "Parameter format",
	K: "Contact identifier",
	L: "Contact traits",
	M: "Contact + response",
	N: "Contact lifecycle (manual)",
	O: "Identity verification (manual)",
	P: "Invalid parameters",
};

export { URL_CONTACT_TRAITS_NOTE };

function caseDef(
	section: UrlContactDocSection,
	id: string,
	name: string,
	anchor: string,
	params: ParamEntry[],
	uiChecklist: string[],
	irChecklist: string[],
	description = "",
): UrlContactPresetCase {
	return {
		id: `${section}${id}`,
		section,
		name,
		description,
		docAnchor: `${URL_CONTACT_IDENTIFICATION_DOC}#${anchor}`,
		params,
		uiChecklist,
		irChecklist,
	};
}

export const URL_CONTACT_PRESET_CASES: UrlContactPresetCase[] = [
	caseDef(
		"J",
		"1",
		"Doc example (project traits)",
		"parameter-format",
		[
			buildContactIdParam(V.contactId),
			buildContactEmailParam(V.contactEmail),
			buildContactTraitParam(T.displayName, V.displayName),
			buildContactTraitParam(T.userName, V.userName),
		],
		["Link opens with contact params in URL"],
		["After submit: customer_123, email, display_name Alice, user_name alice.demo"],
	),
	caseDef(
		"J",
		"2",
		"Encoded trait value",
		"generate-and-encode-links-safely",
		[
			buildContactIdParam(V.contactId),
			buildContactTraitParam(T.displayName, V.displayNameEncoded),
		],
		["URL encodes & as %26"],
		["IR trait display_name is Alice & Bob after submit"],
	),

	caseDef(
		"K",
		"1",
		"contact_id only",
		"choose-the-contact-identifier",
		[buildContactIdParam(V.contactId)],
		["Form opens normally"],
		["After submit: identified as customer_123"],
	),
	caseDef(
		"K",
		"2",
		"contact_email only",
		"choose-the-contact-identifier",
		[buildContactEmailParam(V.contactEmail)],
		["Form opens normally"],
		["After submit: identified by email alice@example.com"],
	),
	caseDef(
		"K",
		"3",
		"contact_id + contact_email",
		"choose-the-contact-identifier",
		[buildContactIdParam(V.contactId), buildContactEmailParam(V.contactEmail)],
		["Form opens normally"],
		["After submit: id=customer_123, email trait alice@example.com"],
	),

	caseDef(
		"L",
		"1",
		"Traits user_name + display_name",
		"add-contact-traits",
		[
			buildContactIdParam(V.contactId),
			buildContactTraitParam(T.userName, V.userName),
			buildContactTraitParam(T.displayName, V.displayName),
		],
		["Form opens normally"],
		["After submit: user_name and display_name on contact in User Data"],
	),
	caseDef(
		"L",
		"2",
		"Invalid trait slug (uppercase/hyphen)",
		"invalid-parameters",
		[buildContactIdParam(V.contactId), buildContactTraitParam(V.invalidTraitSlug, "x")],
		["Invalid trait param ignored; form opens"],
		["After submit: no Display-Name trait; id still applies"],
	),

	caseDef(
		"M",
		"1",
		"contact + response_nps",
		"combine-identification-with-response-prefilling",
		[
			buildContactIdParam(V.contactId),
			buildContactTraitParam(T.displayName, V.displayName),
			buildResponseParam(S.nps, RV.nps),
		],
		["NPS prefilled to 9; contact not auto-submitted"],
		["After submit: customer_123 + display_name Alice + nps=9 in IR"],
	),
	caseDef(
		"M",
		"2",
		"contact + response_em",
		"combine-identification-with-response-prefilling",
		[
			buildContactEmailParam(V.contactEmail),
			buildResponseParam(S.email, RV.email),
		],
		["Email question prefilled; contact email separate"],
		["After submit: contact email + response email in IR"],
	),

	caseDef(
		"N",
		"1",
		"Open only — no submit",
		"when-the-contact-is-created-or-updated",
		[buildContactIdParam(V.contactId), buildContactEmailParam(V.contactEmail)],
		["Open link and close tab without interacting"],
		["No new contact or response created (check User Data / IR list)"],
	),
	caseDef(
		"N",
		"2",
		"Submit creates contact",
		"when-the-contact-is-created-or-updated",
		[buildContactIdParam(V.contactId), buildContactTraitParam(T.displayName, V.displayName)],
		["Complete and submit form"],
		["Contact created/updated on submit with display_name Alice"],
	),

	caseDef(
		"O",
		"1",
		"Signed link (placeholder)",
		"optional-identity-verification",
		[
			buildContactIdParam(V.contactId),
			buildContactSignatureParam(V.placeholderSignature),
		],
		["Replace signature with server HMAC before testing"],
		["Verified identity only if signature valid on dev"],
		"Generate HMAC on server — never in browser. See Publishable SDK Keys doc.",
	),
	caseDef(
		"O",
		"2",
		"Signed link with timestamp (placeholder)",
		"optional-identity-verification",
		[
			buildContactIdParam(V.contactId),
			buildContactSignatureParam(V.placeholderSignature),
			buildContactSignatureTimeParam(V.placeholderSignatureTime),
		],
		["Replace signature + time with server-generated values"],
		["Verified when session-timeout policy configured"],
	),

	caseDef(
		"P",
		"1",
		"Empty contact_id",
		"invalid-parameters",
		[buildContactIdParam("")],
		["Empty id ignored; anonymous form"],
		["Submit as anonymous unless other valid contact params"],
	),
	caseDef(
		"P",
		"2",
		"Repeated contact_id",
		"invalid-parameters",
		[buildContactIdParam(V.contactId), buildContactMultiParam("id", "customer_456")],
		["Repeated contact_id ignored"],
		["After submit: anonymous or no id from URL (not customer_123 or 456)"],
	),
	caseDef(
		"P",
		"3",
		"Invalid contact_id characters",
		"invalid-parameters",
		[buildContactIdParam(V.invalidContactId)],
		["Spaces in id ignored"],
		["Submit without URL identity"],
	),
	caseDef(
		"P",
		"4",
		"Invalid contact_email",
		"invalid-parameters",
		[buildContactEmailParam(V.invalidEmail)],
		["Invalid email ignored"],
		["No email identity from URL"],
	),
	caseDef(
		"P",
		"5",
		"Signature without identifier",
		"invalid-parameters",
		[buildContactSignatureParam(V.placeholderSignature)],
		["Signature without id/email ignored"],
		["Anonymous submission unless manually identified"],
	),
];

export const URL_CONTACT_DOC_SECTIONS = (Object.keys(URL_CONTACT_DOC_SECTION_LABELS) as UrlContactDocSection[]).map(
	(key) => ({
		key,
		label: URL_CONTACT_DOC_SECTION_LABELS[key],
	}),
);
