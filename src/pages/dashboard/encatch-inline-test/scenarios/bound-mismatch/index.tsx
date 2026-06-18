const MISMATCH_FORM_ID = "__encatch-mismatch-test__";

export default function EncatchInlineBoundMismatchPage() {
	return (
		<div id="encatch" data-encatch-form-id={MISMATCH_FORM_ID} className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<h1 className="text-2xl font-semibold">Inline — Bound Mismatch</h1>
			<p className="mt-2 text-muted-foreground">Bound to a different form ID — auto-triggered form falls back to modal.</p>
		</div>
	);
}
