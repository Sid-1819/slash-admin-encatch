import { getEncatchFeedbackFormId1 } from "@/lib/encatch";

export default function EncatchInlineBoundMatchPage() {
	const formId = getEncatchFeedbackFormId1();

	return (
		<div id="encatch" {...(formId ? { "data-encatch-form-id": formId } : {})} className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<h1 className="text-2xl font-semibold">Inline — Bound Match</h1>
			<p className="mt-2 text-muted-foreground">Only the bound form ID renders inline in #encatch.</p>
		</div>
	);
}
