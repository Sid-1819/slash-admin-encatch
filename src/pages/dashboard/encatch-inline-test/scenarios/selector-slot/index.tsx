export default function EncatchInlineSelectorSlotPage() {
	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
			<aside className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
				<p className="mb-3 text-sm font-medium text-violet-700 dark:text-violet-300">Selector — #feedback-slot</p>
				<div className="page-sidebar rounded-md border border-violet-500/20 bg-background/60 p-3">
					<div id="feedback-slot" className="min-h-[280px] rounded-md" />
				</div>
			</aside>

			<section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
				<p className="mb-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">#encatch (fallback host)</p>
				<div className="page-main article-body rounded-md border border-emerald-500/20 bg-background/60 p-3">
					<div id="encatch" className="min-h-[280px] rounded-md" />
				</div>
			</section>
		</div>
	);
}
