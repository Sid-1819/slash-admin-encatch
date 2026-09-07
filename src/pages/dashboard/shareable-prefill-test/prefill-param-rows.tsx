import type { ContactField, ContextParamType, ParamEntry, ParamKind } from "@/lib/shareable-url-params";
import {
	buildContactEmailParam,
	buildContactIdParam,
	buildContactMultiParam,
	buildContactSignatureParam,
	buildContactSignatureTimeParam,
	buildContactTraitParam,
	buildContextParam,
	buildResponseMemberParam,
	buildResponseMultiParam,
	buildResponseParam,
} from "@/lib/shareable-url-params";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text } from "@/ui/typography";
import { Plus, Trash2 } from "lucide-react";

export type PrefillParamRow = {
	id: string;
	kind: ParamKind;
	slugOrName: string;
	member: string;
	value: string;
	contextType: ContextParamType | "";
	contactField: ContactField;
	mode: "set" | "append";
};

export function newPrefillParamRow(): PrefillParamRow {
	return {
		id: crypto.randomUUID(),
		kind: "response",
		slugOrName: "",
		member: "",
		value: "",
		contextType: "",
		contactField: "id",
		mode: "set",
	};
}

export function rowToParamEntry(row: PrefillParamRow): ParamEntry | null {
	const slugOrName = row.slugOrName.trim();
	const value = row.value;

	if (row.kind === "contact") {
		if (row.contactField === "trait" && !slugOrName) return null;
		if (row.mode === "append") {
			return buildContactMultiParam(
				row.contactField,
				value,
				row.contactField === "trait" ? slugOrName : undefined,
			);
		}
		switch (row.contactField) {
			case "id":
				return buildContactIdParam(value);
			case "email":
				return buildContactEmailParam(value);
			case "signature":
				return buildContactSignatureParam(value);
			case "signature_time":
				return buildContactSignatureTimeParam(value);
			case "trait":
				return buildContactTraitParam(slugOrName, value);
		}
	}

	if (row.kind === "context") {
		if (!slugOrName) return null;
		return buildContextParam(
			slugOrName,
			value,
			row.contextType === "" ? undefined : row.contextType,
		);
	}

	if (!slugOrName) return null;

	if (row.member.trim()) {
		return buildResponseMemberParam(slugOrName, row.member.trim(), value);
	}

	if (row.mode === "append") {
		return buildResponseMultiParam(slugOrName, value);
	}

	return buildResponseParam(slugOrName, value);
}

export function rowsToParamEntries(rows: PrefillParamRow[]): ParamEntry[] {
	return rows.flatMap((row) => {
		const entry = rowToParamEntry(row);
		return entry ? [entry] : [];
	});
}

type PrefillParamRowsProps = {
	rows: PrefillParamRow[];
	onChange: (rows: PrefillParamRow[]) => void;
};

function updateRow(rows: PrefillParamRow[], index: number, patch: Partial<PrefillParamRow>): PrefillParamRow[] {
	return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

export function PrefillParamRows({ rows, onChange }: PrefillParamRowsProps) {
	const addRow = () => onChange([...rows, newPrefillParamRow()]);

	const removeRow = (index: number) => {
		onChange(rows.length <= 1 ? [newPrefillParamRow()] : rows.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<Text className="text-sm font-medium">Custom URL parameters</Text>
				<Button type="button" variant="outline" size="sm" onClick={addRow}>
					<Plus className="mr-1 h-4 w-4" />
					Add row
				</Button>
			</div>

			{rows.length === 0 ? (
				<Text className="text-sm text-muted-foreground">
					No rows — add response_, context_, or contact_ parameters.
				</Text>
			) : (
				<div className="space-y-2">
					{rows.map((row, index) => (
						<div key={row.id} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[auto_1fr_1fr_1fr_auto]">
							<div className="space-y-1">
								<Label className="text-xs">Kind</Label>
								<Select
									value={row.kind}
									onValueChange={(kind: ParamKind) => onChange(updateRow(rows, index, { kind }))}
								>
									<SelectTrigger className="w-[120px] text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="response">response_</SelectItem>
										<SelectItem value="context">context_</SelectItem>
										<SelectItem value="contact">contact_</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{row.kind === "contact" ? (
								<>
									<div className="space-y-1">
										<Label className="text-xs">Contact field</Label>
										<Select
											value={row.contactField}
											onValueChange={(contactField: ContactField) =>
												onChange(updateRow(rows, index, { contactField }))
											}
										>
											<SelectTrigger className="text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="id">contact_id</SelectItem>
												<SelectItem value="email">contact_email</SelectItem>
												<SelectItem value="trait">contact_&lt;trait&gt;</SelectItem>
												<SelectItem value="signature">contact_signature</SelectItem>
												<SelectItem value="signature_time">contact_signature_time</SelectItem>
											</SelectContent>
										</Select>
									</div>
									{row.contactField === "trait" ? (
										<div className="space-y-1">
											<Label className="text-xs">Trait slug</Label>
											<Input
												value={row.slugOrName}
												onChange={(e) => onChange(updateRow(rows, index, { slugOrName: e.target.value }))}
												className="font-mono text-xs"
												placeholder="display_name"
											/>
										</div>
									) : (
										<div className="hidden md:block" />
									)}
									<div className="space-y-1">
										<Label className="text-xs">Value</Label>
										<Input
											value={row.value}
											onChange={(e) => onChange(updateRow(rows, index, { value: e.target.value }))}
											className="font-mono text-xs"
											placeholder={
												row.contactField === "id"
													? "customer_123"
													: row.contactField === "email"
														? "alice@example.com"
														: ""
											}
										/>
									</div>
								</>
							) : row.kind === "response" ? (
								<>
									<div className="space-y-1">
										<Label className="text-xs">Slug</Label>
										<Input
											value={row.slugOrName}
											onChange={(e) => onChange(updateRow(rows, index, { slugOrName: e.target.value }))}
											className="font-mono text-xs"
											placeholder="em"
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Member [optional]</Label>
										<Input
											value={row.member}
											onChange={(e) => onChange(updateRow(rows, index, { member: e.target.value }))}
											className="font-mono text-xs"
											placeholder="city or row id"
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Value</Label>
										<Input
											value={row.value}
											onChange={(e) => onChange(updateRow(rows, index, { value: e.target.value }))}
											className="font-mono text-xs"
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Mode</Label>
										<Select
											value={row.mode}
											onValueChange={(mode: "set" | "append") => onChange(updateRow(rows, index, { mode }))}
										>
											<SelectTrigger className="w-[100px] text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="set">set</SelectItem>
												<SelectItem value="append">append</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</>
							) : (
								<>
									<div className="space-y-1">
										<Label className="text-xs">Variable name</Label>
										<Input
											value={row.slugOrName}
											onChange={(e) => onChange(updateRow(rows, index, { slugOrName: e.target.value }))}
											className="font-mono text-xs"
											placeholder="customer_name"
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Type</Label>
										<Select
											value={row.contextType || "default"}
											onValueChange={(v) =>
												onChange(
													updateRow(rows, index, {
														contextType: v === "default" ? "" : (v as ContextParamType),
													}),
												)
											}
										>
											<SelectTrigger className="text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="default">string (default)</SelectItem>
												<SelectItem value="boolean">boolean</SelectItem>
												<SelectItem value="number">number</SelectItem>
												<SelectItem value="string">string [explicit]</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1 md:col-span-2">
										<Label className="text-xs">Value</Label>
										<Input
											value={row.value}
											onChange={(e) => onChange(updateRow(rows, index, { value: e.target.value }))}
											className="font-mono text-xs"
										/>
									</div>
								</>
							)}

							<div className="flex items-end">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeRow(index)}
									aria-label={`Remove row ${index + 1}`}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
