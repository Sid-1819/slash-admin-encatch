import {
	ADD_TO_RESPONSE_CATEGORIES,
	type AddToResponsePrefillRow,
	type AddToResponseQuestionType,
	applyQuestionTypeToRow,
	getAddToResponseTypeLabel,
	getAddToResponseValueHint,
	getDefaultAddToResponseValueText,
	usesBooleanValueEditor,
	usesJsonValueEditor,
	usesNumberValueEditor,
} from "@/lib/add-to-response-types";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/ui/select";
import { Text } from "@/ui/typography";
import { Textarea } from "@/ui/textarea";
import { Sparkles, Trash2 } from "lucide-react";

type AddToResponsePrefillRowsProps = {
	rows: AddToResponsePrefillRow[];
	onChange: (rows: AddToResponsePrefillRow[]) => void;
	onApply: () => void;
	applyDisabled?: boolean;
	result?: string | null;
};

function updateRow(rows: AddToResponsePrefillRow[], index: number, patch: Partial<AddToResponsePrefillRow>): AddToResponsePrefillRow[] {
	return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

function ValueEditor({
	row,
	onValueChange,
}: {
	row: AddToResponsePrefillRow;
	onValueChange: (value: string) => void;
}) {
	const hint = getAddToResponseValueHint(row.questionType);

	if (usesBooleanValueEditor(row.questionType)) {
		const boolValue = row.value.trim() === "false" ? "false" : row.value.trim() === "true" ? "true" : "";
		return (
			<Select value={boolValue || undefined} onValueChange={onValueChange}>
				<SelectTrigger className="w-full text-xs">
					<SelectValue placeholder={row.questionType === "consent" ? "Agreed / not agreed" : "Yes / No"} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="true" className="text-xs">
						{row.questionType === "consent" ? "true (agreed)" : "true (Yes)"}
					</SelectItem>
					<SelectItem value="false" className="text-xs">
						{row.questionType === "consent" ? "false (not agreed)" : "false (No)"}
					</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	if (usesNumberValueEditor(row.questionType)) {
		return <Input type="number" value={row.value} onChange={(e) => onValueChange(e.target.value)} className="font-mono text-xs" placeholder={hint} />;
	}

	if (usesJsonValueEditor(row.questionType) || row.questionType === "long_text") {
		return (
			<Textarea
				value={row.value}
				onChange={(e) => onValueChange(e.target.value)}
				className="min-h-[96px] font-mono text-xs leading-relaxed"
				placeholder={usesJsonValueEditor(row.questionType) ? hint : "Long text value"}
				spellCheck={false}
			/>
		);
	}

	return <Input value={row.value} onChange={(e) => onValueChange(e.target.value)} className="font-mono text-xs" placeholder={hint} />;
}

export function AddToResponsePrefillRows({ rows, onChange, onApply, applyDisabled, result }: AddToResponsePrefillRowsProps) {
	const addRow = () => {
		onChange([...rows, { id: crypto.randomUUID(), questionId: "", questionType: "short_answer", value: "" }]);
	};

	const removeRow = (index: number) => {
		onChange(rows.length <= 1 ? [{ id: crypto.randomUUID(), questionId: "", questionType: "short_answer", value: "" }] : rows.filter((_, i) => i !== index));
	};

	const setQuestionType = (index: number, questionType: AddToResponseQuestionType) => {
		onChange(updateRow(rows, index, applyQuestionTypeToRow(rows[index], questionType)));
	};

	const fillSample = (index: number) => {
		const row = rows[index];
		onChange(updateRow(rows, index, { value: getDefaultAddToResponseValueText(row.questionType) }));
	};

	const readyCount = rows.filter((r) => r.questionId.trim()).length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<Text variant="caption" className="font-medium text-foreground">
						Prefill rows
					</Text>
					<Badge variant="secondary" overlay="square">
						{readyCount} ready
					</Badge>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={addRow}>
					Add row
				</Button>
			</div>

			{rows.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
					<Text variant="caption" className="text-muted-foreground">
						No prefill rows yet. Add a row, pick a question type, and enter the question ID from your form.
					</Text>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					<div className="hidden gap-3 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.5fr)_2.5rem]">
						<span>Question ID</span>
						<span>Type</span>
						<span>Value</span>
						<span className="sr-only">Actions</span>
					</div>

					{rows.map((row, i) => (
						<div key={row.id} className="rounded-lg border border-border/70 bg-muted/10 p-3">
							<div className="mb-3 flex items-center justify-between gap-2 border-b border-border/50 pb-2">
								<div className="flex min-w-0 flex-wrap items-center gap-2">
									<Badge variant="outline" overlay="square" className="font-mono text-[10px]">
										#{i + 1}
									</Badge>
									<Badge variant="info" overlay="square" className="max-w-full truncate">
										{getAddToResponseTypeLabel(row.questionType)}
									</Badge>
								</div>
								<div className="flex shrink-0 items-center gap-1">
									<Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => fillSample(i)}>
										<Sparkles className="size-3.5" />
										Sample
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-8 text-muted-foreground hover:text-destructive"
										onClick={() => removeRow(i)}
										aria-label={`Remove prefill row ${i + 1}`}
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</div>

							<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.5fr)] md:items-start">
								<div className="flex flex-col gap-1.5">
									<Label className="text-[11px] text-muted-foreground md:sr-only">Question ID</Label>
									<Input
										placeholder="UUID or slug"
										value={row.questionId}
										onChange={(e) => onChange(updateRow(rows, i, { questionId: e.target.value }))}
										className="font-mono text-xs"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-[11px] text-muted-foreground md:sr-only">Question type</Label>
									<Select value={row.questionType} onValueChange={(type) => setQuestionType(i, type as AddToResponseQuestionType)}>
										<SelectTrigger className="w-full text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="max-h-72">
											{ADD_TO_RESPONSE_CATEGORIES.map((category) => (
												<SelectGroup key={category.label}>
													<SelectLabel>{category.label}</SelectLabel>
													{category.types.map((type) => (
														<SelectItem key={type} value={type} className="text-xs">
															{getAddToResponseTypeLabel(type)}
														</SelectItem>
													))}
												</SelectGroup>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex flex-col gap-1.5 md:col-span-1">
									<Label className="text-[11px] text-muted-foreground md:sr-only">Value</Label>
									<ValueEditor row={row} onValueChange={(value) => onChange(updateRow(rows, i, { value }))} />
									{usesJsonValueEditor(row.questionType) && (
										<Text variant="caption" className="text-muted-foreground">
											{getAddToResponseValueHint(row.questionType)}
										</Text>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<div className="flex flex-col gap-2 border-t border-border pt-4">
				<div className="flex justify-end">
					<Button type="button" size="sm" onClick={onApply} disabled={applyDisabled}>
						Add to response
					</Button>
				</div>
				{result && (
					<div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
						<Text variant="caption" className="font-medium text-foreground">
							{result}
						</Text>
					</div>
				)}
			</div>
		</div>
	);
}
