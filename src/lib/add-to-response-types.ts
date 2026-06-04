/**
 * addToResponse question types and sample values aligned with @encatch/schema AnswerItem.
 * Panel types (welcome, thank_you, message_panel, exit_form) are excluded — no answer to prefill.
 */

export const PANEL_QUESTION_TYPES = ["welcome", "thank_you", "message_panel", "exit_form"] as const;

export type PanelQuestionType = (typeof PANEL_QUESTION_TYPES)[number];

export const ADD_TO_RESPONSE_QUESTION_TYPES = [
	"rating",
	"csat",
	"nps",
	"opinion_scale",
	"single_choice",
	"yes_no",
	"nested_selection",
	"picture_choice",
	"multiple_choice_multiple",
	"consent",
	"ranking",
	"rating_matrix",
	"matrix_single_choice",
	"matrix_multiple_choice",
	"short_answer",
	"long_text",
	"date",
	"number",
	"email",
	"phone_number",
	"website",
	"address",
	"signature",
	"file_upload",
	"video_audio",
	"scheduler",
	"qna_with_ai",
	"annotation",
	"payments_upi",
] as const;

export type AddToResponseQuestionType = (typeof ADD_TO_RESPONSE_QUESTION_TYPES)[number];

export type AddToResponseCategory = {
	label: string;
	types: AddToResponseQuestionType[];
};

/** Grouped like the form builder palette (panels excluded). */
export const ADD_TO_RESPONSE_CATEGORIES: AddToResponseCategory[] = [
	{
		label: "Scale",
		types: ["rating", "csat", "nps", "opinion_scale"],
	},
	{
		label: "Choice",
		types: ["single_choice", "yes_no", "nested_selection", "picture_choice", "multiple_choice_multiple", "consent", "ranking"],
	},
	{
		label: "Matrix",
		types: ["rating_matrix", "matrix_single_choice", "matrix_multiple_choice"],
	},
	{
		label: "Text",
		types: ["short_answer", "long_text", "date", "number"],
	},
	{
		label: "Contact info",
		types: ["email", "phone_number", "website", "address", "signature"],
	},
	{
		label: "Advanced",
		types: ["file_upload", "video_audio", "scheduler", "qna_with_ai", "annotation", "payments_upi"],
	},
];

const TYPE_LABELS: Record<AddToResponseQuestionType, string> = {
	rating: "Rating",
	csat: "CSAT",
	nps: "NPS",
	opinion_scale: "Opinion scale",
	single_choice: "Single choice",
	yes_no: "Yes / No",
	nested_selection: "Nested selection",
	picture_choice: "Picture choice",
	multiple_choice_multiple: "Multiple choice",
	consent: "Consent",
	ranking: "Ranking",
	rating_matrix: "Rating matrix",
	matrix_single_choice: "Matrix (single per row)",
	matrix_multiple_choice: "Matrix (multiple per row)",
	short_answer: "Short answer",
	long_text: "Long answer",
	date: "Date",
	number: "Number",
	email: "Email",
	phone_number: "Phone number",
	website: "Website",
	address: "Address",
	signature: "Signature",
	file_upload: "File upload",
	video_audio: "Video / audio / photo",
	scheduler: "Scheduler",
	qna_with_ai: "Q&A with AI",
	annotation: "Annotation",
	payments_upi: "Payments UPI",
};

const JSON_VALUE_TYPES = new Set<AddToResponseQuestionType>([
	"nested_selection",
	"picture_choice",
	"multiple_choice_multiple",
	"ranking",
	"rating_matrix",
	"matrix_single_choice",
	"matrix_multiple_choice",
	"phone_number",
	"address",
	"signature",
	"file_upload",
	"video_audio",
	"scheduler",
	"qna_with_ai",
	"annotation",
	"payments_upi",
]);

const BOOLEAN_VALUE_TYPES = new Set<AddToResponseQuestionType>(["yes_no", "consent"]);

const NUMBER_VALUE_TYPES = new Set<AddToResponseQuestionType>(["rating", "csat", "nps", "opinion_scale"]);

export function getAddToResponseTypeLabel(type: AddToResponseQuestionType): string {
	return TYPE_LABELS[type];
}

export function usesJsonValueEditor(type: AddToResponseQuestionType): boolean {
	return JSON_VALUE_TYPES.has(type);
}

export function usesBooleanValueEditor(type: AddToResponseQuestionType): boolean {
	return BOOLEAN_VALUE_TYPES.has(type);
}

export function usesNumberValueEditor(type: AddToResponseQuestionType): boolean {
	return NUMBER_VALUE_TYPES.has(type);
}

/** Default sample value per question type for quick testing. */
export function getDefaultAddToResponseValue(type: AddToResponseQuestionType): unknown {
	switch (type) {
		case "rating":
			return 4;
		case "csat":
			return 4;
		case "nps":
			return 9;
		case "opinion_scale":
			return 7;
		case "single_choice":
			return "option_1";
		case "yes_no":
		case "consent":
			return true;
		case "nested_selection":
			return ["category_a", "sub_option_1"];
		case "picture_choice":
			return ["picture_option_1"];
		case "multiple_choice_multiple":
			return ["option_a", "option_b"];
		case "ranking":
			return ["option_a", "option_b", "option_c"];
		case "rating_matrix":
			return { statement_1: 4, statement_2: 5 };
		case "matrix_single_choice":
			return { row_1: "column_a", row_2: "column_b" };
		case "matrix_multiple_choice":
			return { row_1: ["column_a"], row_2: ["column_a", "column_b"] };
		case "short_answer":
			return "Sample short answer";
		case "long_text":
			return "Sample long answer text for testing addToResponse.";
		case "date":
			return "2024-06-15";
		case "number":
			return "42";
		case "email":
			return "test@example.com";
		case "website":
			return "https://example.com";
		case "phone_number":
			return { countryCode: "+1", number: "5551234567", e164: "+15551234567" };
		case "address":
			return {
				addressLine1: "123 Main St",
				city: "San Francisco",
				stateProvince: "CA",
				postalCode: "94105",
				country: "US",
			};
		case "signature":
			return { mode: "type", typedName: "Jane Doe" };
		case "file_upload":
			return [
				{
					fileUrl: "https://example.com/uploads/sample.pdf",
					fileName: "sample.pdf",
					fileSizeMb: 0.5,
					mimeType: "application/pdf",
				},
			];
		case "video_audio":
			return { mode: "text", text: "Sample video/audio text response" };
		case "scheduler":
			return { provider: "google_calendar", bookedAt: "1710000000" };
		case "qna_with_ai":
			return [{ question: "What is your return policy?", answer: "Returns are accepted within 30 days." }];
		case "annotation":
			return {
				fileType: "video/mp4",
				fileName: "demo.mp4",
				markers: [{ markerNo: "1", timeline: "00:01:30", comment: "Issue here" }],
			};
		case "payments_upi":
			return {
				transactionId: "123456789012",
				encatchPaymentReference: "enc_ref_sample_001",
				amount: "99.00",
				currency: "INR",
				payeeVpa: "merchant@upi",
				payeeName: "Sample Merchant",
				selfReported: true,
			};
		default:
			return "";
	}
}

export function serializeAddToResponseValue(value: unknown): string {
	if (typeof value === "string") return value;
	return JSON.stringify(value, null, 2);
}

export function getDefaultAddToResponseValueText(type: AddToResponseQuestionType): string {
	return serializeAddToResponseValue(getDefaultAddToResponseValue(type));
}

export function getAddToResponseValueHint(type: AddToResponseQuestionType): string {
	if (usesBooleanValueEditor(type)) return "true = Yes / agreed, false = No / not agreed";
	if (usesNumberValueEditor(type)) {
		if (type === "nps") return "Number 0–10";
		if (type === "csat") return "Number 1–5 (scale size depends on form)";
		if (type === "rating") return "Number 1–5 (or form max rating)";
		return "Numeric scale value";
	}
	if (type === "single_choice") return "Option value string from the form schema";
	if (type === "short_answer" || type === "long_text" || type === "email" || type === "website" || type === "date" || type === "number") {
		return "Plain text value";
	}
	if (usesJsonValueEditor(type)) return "JSON matching the answer shape in @encatch/schema";
	return "Value sent to addToResponse()";
}

/** Parse row value for the SDK based on question type. */
export function parseAddToResponseValue(type: AddToResponseQuestionType, raw: string): unknown {
	const trimmed = raw.trim();
	if (usesBooleanValueEditor(type)) {
		if (trimmed === "true") return true;
		if (trimmed === "false") return false;
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (typeof parsed === "boolean") return parsed;
		} catch {
			// fall through
		}
		throw new Error(`Expected true or false for ${getAddToResponseTypeLabel(type)}`);
	}
	if (usesNumberValueEditor(type)) {
		if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
		} catch {
			// fall through
		}
		throw new Error(`Expected a number for ${getAddToResponseTypeLabel(type)}`);
	}
	if (usesJsonValueEditor(type)) {
		if (!trimmed) throw new Error("JSON value required");
		return JSON.parse(trimmed) as unknown;
	}
	if (trimmed === "") return "";
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return trimmed;
	}
}

export type AddToResponsePrefillRow = {
	id: string;
	questionId: string;
	questionType: AddToResponseQuestionType;
	value: string;
};

export function newAddToResponsePrefillRow(questionId = "", questionType: AddToResponseQuestionType = "short_answer"): AddToResponsePrefillRow {
	return {
		id: crypto.randomUUID(),
		questionId,
		questionType,
		value: questionId ? getDefaultAddToResponseValueText(questionType) : "",
	};
}

export function applyQuestionTypeToRow(row: AddToResponsePrefillRow, questionType: AddToResponseQuestionType): AddToResponsePrefillRow {
	return {
		...row,
		questionType,
		value: getDefaultAddToResponseValueText(questionType),
	};
}

function isAddToResponseQuestionType(value: unknown): value is AddToResponseQuestionType {
	return typeof value === "string" && (ADD_TO_RESPONSE_QUESTION_TYPES as readonly string[]).includes(value);
}

/** Load persisted prefill rows; migrates legacy { key, value } rows. */
export function parseAddToResponsePrefillRows(raw: string): AddToResponsePrefillRow[] {
	if (!raw.trim()) return [newAddToResponsePrefillRow()];
	const arr = JSON.parse(raw) as unknown;
	if (!Array.isArray(arr)) return [newAddToResponsePrefillRow()];
	const rows = arr
		.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
		.map((x) => {
			const legacyKey = typeof x.key === "string" ? x.key : "";
			const questionId = typeof x.questionId === "string" ? x.questionId : legacyKey;
			const questionType = isAddToResponseQuestionType(x.questionType) ? x.questionType : "short_answer";
			const value = typeof x.value === "string" ? x.value : "";
			return {
				id: crypto.randomUUID(),
				questionId,
				questionType,
				value,
			} satisfies AddToResponsePrefillRow;
		});
	return rows.length > 0 ? rows : [newAddToResponsePrefillRow()];
}

export function serializeAddToResponsePrefillRows(rows: AddToResponsePrefillRow[]): string {
	return JSON.stringify(rows.map(({ questionId, questionType, value }) => ({ questionId, questionType, value })));
}
