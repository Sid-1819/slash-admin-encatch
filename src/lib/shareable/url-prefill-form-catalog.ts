/**
 * Slugs and option values for URL prefilling against All Questions Test.
 * Keep in sync with e2e/fixtures/url-prefill-all-questions-test-form-bundle.v1.json
 */

export const URL_PREFILL_FORM_TITLE = "All Questions Test";

export const URL_PREFILL_FORM_SLUGS = {
	welcome: "wel",
	rating: "rt",
	email: "em",
	csat: "csat",
	nps: "nps",
	opinionScale: "os",
	singleChoice: "sc",
	yesNo: "yn",
	nestedSelection: "ns",
	pictureChoice: "pc",
	multipleChoice: "mc",
	consent: "cn",
	ranking: "rk",
	ratingMatrix: "rm",
	matrixSingle: "msc",
	matrixMultiple: "mmc",
	shortAnswer: "sa",
	longText: "la",
	date: "dt",
	number: "num",
	phone: "ph",
	website: "web",
	address: "addr",
	signature: "sig",
} as const;

export const URL_PREFILL_OPTION_VALUES = {
	singleChoiceOption1: "option_1",
	singleChoiceOption2: "option2",
	mcOptionA: "option_a",
	mcOptionB: "option_b",
	pictureOption1: "picture_option_1",
	rankOptionA: "option_a",
	rankOptionB: "option_b",
	rankOptionC: "option_c",
	nestedParent: "category_a",
	nestedChild: "sub_option_1",
	matrixRow1: "row_1",
	matrixRow2: "row_2",
	matrixColA: "column_a",
	matrixColB: "column_b",
	ratingMatrixStatement1: "statement_1",
	/** Scale point id for value 4 ("Very good") on rm — doc uses scale-point id, not raw number. */
	ratingMatrixScalePoint4: "sp-1780745768686-4",
} as const;

export const URL_PREFILL_PRESET_VALUES = {
	shortAnswer: "Ada",
	longText: "Sample long text",
	email: "user@example.com",
	website: "example.com/docs",
	phone: "+919876543210",
	number: "42",
	date: "2026-09-03",
	dateTime: "2026-09-03T14:30",
	yesNo: "true",
	rating: "4",
	nps: "9",
	csat: "5",
	opinionScale: "3",
	singleChoice: URL_PREFILL_OPTION_VALUES.singleChoiceOption1,
	addressCity: "Bengaluru",
	addressCountry: "IN",
	contextCustomerName: "Ada",
	contextCustomerId: "00123",
	contextIsTrial: "true",
	contextInvoiceTotal: "1499.50",
	contextCampaign: "renewal",
} as const;

/** Welcome must include liquid text for context_* presets (section H). */
export const URL_PREFILL_CONTEXT_WELCOME_NOTE =
	"Section H context presets need welcome copy with {{ context.customer_name }} etc. Add in the form editor if not present.";
