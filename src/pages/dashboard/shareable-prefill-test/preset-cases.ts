import type { ParamEntry } from "@/lib/shareable-url-params";
import {
	buildContextMultiParam,
	buildContextParam,
	buildResponseMemberMultiParam,
	buildResponseMemberParam,
	buildResponseMultiParam,
	buildResponseParam,
} from "@/lib/shareable-url-params";

import {
	URL_PREFILL_CONTEXT_WELCOME_NOTE,
	URL_PREFILL_FORM_SLUGS as S,
	URL_PREFILL_OPTION_VALUES as O,
	URL_PREFILL_PRESET_VALUES as V,
} from "@/lib/shareable/url-prefill-form-catalog";

export type UrlPrefillDocSection =
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I";

export type UrlPrefillPresetCase = {
	id: string;
	section: UrlPrefillDocSection;
	name: string;
	description: string;
	docAnchor: string;
	params: ParamEntry[];
	uiChecklist: string[];
	irChecklist: string[];
};

export const URL_PREFILL_DOC_SECTION_LABELS: Record<UrlPrefillDocSection, string> = {
	A: "Parameter format",
	B: "Scalar questions",
	C: "Multi-value & ordered",
	D: "Matrix questions",
	E: "Address questions",
	F: "Unsupported types",
	G: "Validation & invalid values",
	H: "Context variables",
	I: "Submit behavior (manual IR)",
};

const DOC_BASE = "https://dev.encatch.com/docs/shareable-feedback/advanced-configuration";

function caseDef(
	section: UrlPrefillDocSection,
	id: string,
	name: string,
	anchor: string,
	params: ParamEntry[],
	uiChecklist: string[],
	irChecklist: string[],
	description = "",
): UrlPrefillPresetCase {
	return {
		id: `${section}${id}`,
		section,
		name,
		description,
		docAnchor: `${DOC_BASE}#${anchor}`,
		params,
		uiChecklist,
		irChecklist,
	};
}

export const URL_PREFILL_PRESET_CASES: UrlPrefillPresetCase[] = [
	caseDef(
		"A",
		"1",
		"Scalar + multi append",
		"parameter-format",
		[
			buildResponseParam(S.email, V.email),
			buildResponseParam(S.nps, V.nps),
			buildResponseMultiParam(S.multipleChoice, O.mcOptionA),
			buildResponseMultiParam(S.multipleChoice, O.mcOptionB),
		],
		["Email (em) shows user@example.com", "NPS shows 9", "Multiple choice has option_a and option_b"],
		["Email, NPS, and MC options in Individual Responses after submit"],
	),
	caseDef(
		"A",
		"2",
		"Matrix bracket param",
		"matrix-questions",
		[buildResponseMemberParam(S.matrixSingle, O.matrixRow1, O.matrixColA)],
		["Matrix msc row_1 has column_a selected"],
		["Matrix single-choice row in IR"],
	),
	caseDef(
		"A",
		"3",
		"Bracket encoding (percent in URL bar)",
		"matrix-questions",
		[buildResponseMemberParam(S.matrixSingle, O.matrixRow1, O.matrixColA)],
		["Same as A2 — response_msc%5Brow_1%5D=column_a"],
		["Same as A2"],
		"URLSearchParams percent-encodes brackets; equivalent to literal brackets per doc",
	),

	caseDef("B", "1", "Short answer (sa)", "scalar-questions", [buildResponseParam(S.shortAnswer, V.shortAnswer)], ["Short answer shows Ada"], ["Short answer in IR"]),
	caseDef("B", "2", "Long text (la)", "scalar-questions", [buildResponseParam(S.longText, V.longText)], ["Long text prefilled"], ["Long text in IR"]),
	caseDef("B", "3", "Email (em)", "scalar-questions", [buildResponseParam(S.email, V.email)], ["Email prefilled"], ["Email in IR"]),
	caseDef("B", "4", "Website (web)", "scalar-questions", [buildResponseParam(S.website, V.website)], ["Website prefilled"], ["Website in IR"]),
	caseDef("B", "5", "Phone (ph)", "scalar-questions", [buildResponseParam(S.phone, V.phone)], ["Phone prefilled"], ["Phone in IR"]),
	caseDef("B", "6", "Number (num)", "scalar-questions", [buildResponseParam(S.number, V.number)], ["Number shows 42"], ["Number in IR"], "Form allows integers 2–22 only"),
	caseDef("B", "7", "Date (dt)", "scalar-questions", [buildResponseParam(S.date, V.date)], ["Date shows 2026-09-03"], ["Date in IR"]),
	caseDef("B", "8", "Date with time (dt)", "scalar-questions", [buildResponseParam(S.date, V.dateTime)], ["Date-time shows 2026-09-03 14:30"], ["Date-time in IR"]),
	caseDef("B", "9", "Yes/No (yn)", "scalar-questions", [buildResponseParam(S.yesNo, V.yesNo)], ["Yes selected"], ["Yes/No in IR"]),
	caseDef("B", "10", "Rating (rt)", "scalar-questions", [buildResponseParam(S.rating, V.rating)], ["Rating shows 4"], ["Rating in IR"]),
	caseDef("B", "11", "NPS (nps)", "scalar-questions", [buildResponseParam(S.nps, V.nps)], ["NPS shows 9"], ["NPS in IR"]),
	caseDef("B", "12", "CSAT (csat)", "scalar-questions", [buildResponseParam(S.csat, V.csat)], ["CSAT shows 5"], ["CSAT in IR"]),
	caseDef("B", "13", "Opinion scale (os)", "scalar-questions", [buildResponseParam(S.opinionScale, V.opinionScale)], ["Opinion scale shows 3"], ["Opinion scale in IR"]),
	caseDef(
		"B",
		"14",
		"Single choice by value (sc)",
		"scalar-questions",
		[buildResponseParam(S.singleChoice, V.singleChoice)],
		["Option 1 selected (option_1 value)"],
		["Single choice in IR"],
	),

	caseDef(
		"C",
		"1",
		"Multiple choice (mc)",
		"multi-value-and-ordered-questions",
		[
			buildResponseMultiParam(S.multipleChoice, O.mcOptionA),
			buildResponseMultiParam(S.multipleChoice, O.mcOptionB),
		],
		["option_a and option_b selected"],
		["Both MC options in IR"],
	),
	caseDef(
		"C",
		"2",
		"Picture choice (pc)",
		"multi-value-and-ordered-questions",
		[buildResponseMultiParam(S.pictureChoice, O.pictureOption1)],
		["picture_option_1 selected"],
		["Picture choice in IR"],
	),
	caseDef(
		"C",
		"3",
		"Ranking (rk)",
		"multi-value-and-ordered-questions",
		[
			buildResponseMultiParam(S.ranking, O.rankOptionA),
			buildResponseMultiParam(S.ranking, O.rankOptionB),
			buildResponseMultiParam(S.ranking, O.rankOptionC),
		],
		["Ranking order: option_a → option_b → option_c"],
		["Ranking order in IR"],
	),
	caseDef(
		"C",
		"4",
		"Nested selection (ns)",
		"multi-value-and-ordered-questions",
		[
			buildResponseMultiParam(S.nestedSelection, O.nestedParent),
			buildResponseMultiParam(S.nestedSelection, O.nestedChild),
		],
		["Path category_a → sub_option_1"],
		["Nested selection in IR"],
	),
	caseDef(
		"C",
		"5",
		"Incomplete nested path",
		"multi-value-and-ordered-questions",
		[buildResponseMultiParam(S.nestedSelection, O.nestedParent)],
		["Nested selection incomplete — parent only"],
		["No nested answer unless filled manually"],
	),

	caseDef(
		"D",
		"1",
		"Matrix single (msc)",
		"matrix-questions",
		[
			buildResponseMemberParam(S.matrixSingle, O.matrixRow1, O.matrixColA),
			buildResponseMemberParam(S.matrixSingle, O.matrixRow2, O.matrixColB),
		],
		["row_1=column_a, row_2=column_b"],
		["Matrix rows in IR"],
	),
	caseDef(
		"D",
		"2",
		"Matrix multiple (mmc)",
		"matrix-questions",
		[
			buildResponseMemberMultiParam(S.matrixMultiple, O.matrixRow1, O.matrixColA),
			buildResponseMemberMultiParam(S.matrixMultiple, O.matrixRow1, O.matrixColB),
		],
		["row_1 has column_a and column_b"],
		["Matrix MC in IR"],
	),
	caseDef(
		"D",
		"3",
		"Rating matrix (rm)",
		"matrix-questions",
		[buildResponseMemberParam(S.ratingMatrix, O.ratingMatrixStatement1, O.ratingMatrixScalePoint4)],
		["statement_1 rated 4 (Very good)"],
		["Rating matrix in IR"],
	),

	caseDef(
		"E",
		"1",
		"Address partial (addr)",
		"address-questions",
		[
			buildResponseMemberParam(S.address, "city", V.addressCity),
			buildResponseMemberParam(S.address, "country", V.addressCountry),
		],
		["City and country prefilled"],
		["Partial address in IR"],
	),
	caseDef(
		"E",
		"2",
		"Address full",
		"address-questions",
		[
			buildResponseMemberParam(S.address, "addressLine1", "123 Main St"),
			buildResponseMemberParam(S.address, "addressLine2", "Suite 4"),
			buildResponseMemberParam(S.address, "city", V.addressCity),
			buildResponseMemberParam(S.address, "stateProvince", "KA"),
			buildResponseMemberParam(S.address, "postalCode", "560001"),
			buildResponseMemberParam(S.address, "country", V.addressCountry),
		],
		["All address fields prefilled"],
		["Full address in IR"],
	),
	caseDef(
		"E",
		"3",
		"Unknown address member",
		"address-questions",
		[buildResponseMemberParam(S.address, "foo", "bar")],
		["Unknown member ignored"],
		["Only manual address in IR"],
	),

	caseDef(
		"F",
		"1",
		"Signature (sig) unsupported",
		"unsupported-question-types",
		[buildResponseParam(S.signature, "fake")],
		["Signature empty; form opens"],
		["Signature only if drawn manually"],
	),
	caseDef(
		"F",
		"2",
		"Welcome (wel) display-only",
		"unsupported-question-types",
		[buildResponseParam(S.welcome, "ignored")],
		["Welcome unchanged"],
		["No welcome response in IR"],
	),

	caseDef("G", "1", "Unknown slug", "validation-and-invalid-values", [buildResponseParam("unknownslug", "x")], ["Form opens"], ["No effect"]),
	caseDef("G", "2", "Invalid NPS", "validation-and-invalid-values", [buildResponseParam(S.nps, "99")], ["NPS empty"], ["NPS manual only"]),
	caseDef(
		"G",
		"3",
		"Duplicate scalar email",
		"validation-and-invalid-values",
		[
			buildResponseMultiParam(S.email, "first@example.com"),
			buildResponseMultiParam(S.email, "second@example.com"),
		],
		["First email wins"],
		["First email if unchanged submit"],
	),
	caseDef(
		"G",
		"4",
		"Unknown MC option",
		"validation-and-invalid-values",
		[buildResponseMultiParam(S.multipleChoice, "badoption")],
		["MC empty for bad option"],
		["MC manual only"],
	),
	caseDef(
		"G",
		"5",
		"Comma in value",
		"validation-and-invalid-values",
		[buildResponseParam(S.shortAnswer, "Ada,Lovelace")],
		["Single value Ada,Lovelace"],
		["Comma preserved in IR"],
	),
	caseDef("G", "6", "Empty email", "validation-and-invalid-values", [buildResponseParam(S.email, "")], ["Email empty"], ["Email manual only"]),

	caseDef(
		"H",
		"1",
		"Context string",
		"pass-context-variables",
		[buildContextParam("customer_name", V.contextCustomerName)],
		[`Welcome shows customer name (${URL_PREFILL_CONTEXT_WELCOME_NOTE})`],
		["Context not in IR answers"],
	),
	caseDef(
		"H",
		"2",
		"Context ID leading zeros",
		"pass-context-variables",
		[buildContextParam("customer_id", V.contextCustomerId)],
		["ID 00123 on welcome if liquid configured"],
		["No customer_id response"],
	),
	caseDef(
		"H",
		"3",
		"Context boolean",
		"context-rules",
		[buildContextParam("is_trial", V.contextIsTrial, "boolean")],
		["Trial flag on welcome if liquid configured"],
		["No is_trial response"],
	),
	caseDef(
		"H",
		"4",
		"Context number",
		"context-rules",
		[buildContextParam("invoice_total", V.contextInvoiceTotal, "number")],
		["Invoice total on welcome if liquid configured"],
		["No invoice_total response"],
	),
	caseDef(
		"H",
		"5",
		"Context explicit string",
		"context-rules",
		[buildContextParam("campaign", V.contextCampaign, "string")],
		["Campaign on welcome if liquid configured"],
		["No campaign response"],
	),
	caseDef(
		"H",
		"6",
		"Combined context + response",
		"pass-context-variables",
		[
			buildContextParam("customer_name", V.contextCustomerName),
			buildContextParam("is_trial", V.contextIsTrial, "boolean"),
			buildResponseParam(S.nps, V.nps),
		],
		["NPS prefilled + context on welcome if liquid configured"],
		["NPS in IR only"],
	),
	caseDef(
		"H",
		"7",
		"Repeated context variable",
		"context-rules",
		[buildContextParam("customer_name", "Ada"), buildContextMultiParam("customer_name", "Bob")],
		["Repeated var ignored"],
		["No context in IR"],
	),
	caseDef(
		"H",
		"8",
		"Blocked __proto__",
		"context-rules",
		[buildContextParam("__proto__", "x")],
		["Ignored"],
		["No effect"],
	),

	caseDef(
		"I",
		"1",
		"Submit unchanged prefilled",
		"scalar-questions",
		[buildResponseParam(S.email, V.email), buildResponseParam(S.nps, V.nps)],
		["Submit without changes"],
		["IR matches prefilled em + nps"],
	),
	caseDef(
		"I",
		"2",
		"Change then submit",
		"scalar-questions",
		[buildResponseParam(S.email, V.email)],
		["Change email before submit"],
		["IR shows changed email"],
	),
	caseDef(
		"I",
		"3",
		"Plain link",
		"parameter-format",
		[],
		["No params — fill manually"],
		["Normal submission in IR"],
	),
];

export function presetsForSection(section: UrlPrefillDocSection): UrlPrefillPresetCase[] {
	return URL_PREFILL_PRESET_CASES.filter((c) => c.section === section);
}

export const URL_PREFILL_DOC_SECTIONS = (Object.keys(URL_PREFILL_DOC_SECTION_LABELS) as UrlPrefillDocSection[]).map(
	(key) => ({
		key,
		label: URL_PREFILL_DOC_SECTION_LABELS[key],
	}),
);
