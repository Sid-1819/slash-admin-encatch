import { Icon } from "@/components/icon";
import {
	countByLevel,
	formatLogIstTimestamp,
	formatLogJson,
	formatLogTableTimestamp,
	formatLogUtcTimestamp,
	LOG_LEVELS,
	parseEncatchLogText,
	truncateText,
	type EncatchLogEntry,
	type EncatchLogLevel,
} from "@/lib/encatch-log-parser";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { ScrollArea } from "@/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";
import { Text } from "@/ui/typography";
import { cn } from "@/utils";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const LOG_FILE_ACCEPT = ".log,.txt,.json,text/plain,application/json,application/x-ndjson";

const LEVEL_BADGE_CLASS: Record<EncatchLogLevel, string> = {
	INFO: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
	WARN: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
	ERROR: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
	DEBUG: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
	TRACE: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
	RAW: "border-border bg-muted text-muted-foreground",
};

function LevelBadge({ level }: { level: EncatchLogLevel }) {
	return (
		<Badge variant="outline" className={cn("font-mono text-[10px] uppercase", LEVEL_BADGE_CLASS[level])}>
			{level}
		</Badge>
	);
}

function StatCard({ label, value, dotClass }: { label: string; value: number; dotClass: string }) {
	return (
		<Card className="border-border/60 py-0 shadow-none">
			<CardContent className="flex items-center gap-3 px-4 py-3">
				<span className={cn("size-2.5 rounded-full", dotClass)} />
				<div>
					<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
					<div className="text-xl font-semibold tabular-nums">{value}</div>
				</div>
			</CardContent>
		</Card>
	);
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-start">
			<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className="min-w-0 text-sm break-all">{children}</div>
		</div>
	);
}

function LogDetailDialog({
	entry,
	open,
	onOpenChange,
}: {
	entry: EncatchLogEntry | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open && !!entry} onOpenChange={onOpenChange}>
			{entry ? (
			<DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-left">
						<LevelBadge level={entry.level} />
						<span>Log Entry</span>
					</DialogTitle>
				</DialogHeader>

				<ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
					<div className="space-y-4 pb-2">
						<DetailField label="Timestamp (UTC)">{formatLogUtcTimestamp(entry.timestamp)}</DetailField>
						<DetailField label="Timestamp (IST)">{formatLogIstTimestamp(entry.timestamp)}</DetailField>
						<DetailField label="Level">
							<LevelBadge level={entry.level} />
						</DetailField>
						<DetailField label="Service">{entry.service ?? "—"}</DetailField>
						<DetailField label="Target">{entry.target ?? "—"}</DetailField>
						<DetailField label="Path">{entry.path ?? "—"}</DetailField>
						<DetailField label="Status">{entry.status ?? "—"}</DetailField>
						<DetailField label="Trace ID">{entry.traceId ?? "—"}</DetailField>
						<DetailField label="Span ID">{entry.spanId ?? "—"}</DetailField>
						<DetailField label="Line">{entry.lineNumber ?? "—"}</DetailField>
						<DetailField label="Message">{entry.message ?? "—"}</DetailField>
						<DetailField label="Error">{entry.error ?? "—"}</DetailField>

						<div className="space-y-2">
							<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Raw JSON</div>
							<pre className="max-h-80 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-all">
								{formatLogJson(entry.raw)}
							</pre>
						</div>
					</div>
				</ScrollArea>
			</DialogContent>
			) : null}
		</Dialog>
	);
}

export default function EncatchLogViewerPage() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [input, setInput] = useState("");
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
	const [parsed, setParsed] = useState<ReturnType<typeof parseEncatchLogText> | null>(null);
	const [search, setSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [pathFilter, setPathFilter] = useState("");
	const [serviceFilter, setServiceFilter] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
	const [selectedEntry, setSelectedEntry] = useState<EncatchLogEntry | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const resetFilters = useCallback(() => {
		setPage(1);
		setSearch("");
		setLevelFilter("all");
		setStatusFilter("all");
		setPathFilter("");
		setServiceFilter("");
	}, []);

	const parseLogText = useCallback(
		(text: string) => {
			setParsed(parseEncatchLogText(text));
			resetFilters();
		},
		[resetFilters],
	);

	const handleParse = useCallback(() => {
		parseLogText(input);
	}, [input, parseLogText]);

	const handleFileUpload = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			event.target.value = "";
			if (!file) return;

			const reader = new FileReader();
			reader.onload = () => {
				const text = typeof reader.result === "string" ? reader.result : "";
				if (!text.trim()) {
					toast.error("The selected file is empty.");
					return;
				}

				setInput(text);
				setUploadedFileName(file.name);
				parseLogText(text);
				toast.success(`Loaded ${file.name}`);
			};
			reader.onerror = () => {
				toast.error(`Could not read ${file.name}`);
			};
			reader.readAsText(file);
		},
		[parseLogText],
	);

	const handleClear = useCallback(() => {
		setInput("");
		setUploadedFileName(null);
		setParsed(null);
		setSearch("");
		setLevelFilter("all");
		setStatusFilter("all");
		setPathFilter("");
		setServiceFilter("");
		setPage(1);
		setSelectedEntry(null);
		setDialogOpen(false);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	const clearFilters = useCallback(() => {
		setSearch("");
		setLevelFilter("all");
		setStatusFilter("all");
		setPathFilter("");
		setServiceFilter("");
		setPage(1);
	}, []);

	const filteredEntries = useMemo(() => {
		if (!parsed) return [];

		const query = search.trim().toLowerCase();
		const pathQuery = pathFilter.trim().toLowerCase();
		const serviceQuery = serviceFilter.trim().toLowerCase();

		return parsed.entries.filter((entry) => {
			if (levelFilter !== "all" && entry.level !== levelFilter) return false;
			if (statusFilter !== "all") {
				const status = (entry.status ?? "—").toLowerCase();
				if (statusFilter === "none" && entry.status) return false;
				if (statusFilter !== "none" && status !== statusFilter.toLowerCase()) return false;
			}
			if (pathQuery && !(entry.path?.toLowerCase().includes(pathQuery) ?? false)) return false;
			if (serviceQuery && !(entry.service?.toLowerCase().includes(serviceQuery) ?? false)) return false;
			if (!query) return true;

			const haystack = [entry.message, entry.target, entry.traceId, entry.spanId, entry.path, entry.error, entry.service]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return haystack.includes(query);
		});
	}, [parsed, search, levelFilter, statusFilter, pathFilter, serviceFilter]);

	const levelCounts = useMemo(() => countByLevel(parsed?.entries ?? []), [parsed]);

	const statusOptions = useMemo(() => {
		if (!parsed) return [];
		return [...new Set(parsed.entries.map((e) => e.status).filter(Boolean))] as string[];
	}, [parsed]);

	const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
	const currentPage = Math.min(page, totalPages);

	const paginatedEntries = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredEntries.slice(start, start + pageSize);
	}, [filteredEntries, currentPage, pageSize]);

	const openEntry = useCallback((entry: EncatchLogEntry) => {
		setSelectedEntry(entry);
		setDialogOpen(true);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:document-text-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch Log Viewer</h2>
					<Text variant="body2" className="text-muted-foreground">
						Paste logs or upload a .log file, browse them in a table, and click any row for full UTC/IST details.
					</Text>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Input</CardTitle>
					<CardDescription>Paste raw log lines or upload a .log / .txt / .json file (one JSON object per line).</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<input
							ref={fileInputRef}
							id="encatch-log-file"
							type="file"
							accept={LOG_FILE_ACCEPT}
							className="hidden"
							onChange={handleFileUpload}
						/>
						<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
							<Icon icon="solar:upload-bold-duotone" size={18} className="mr-1.5" />
							Upload log file
						</Button>
						{uploadedFileName && (
							<Badge variant="secondary" className="max-w-full truncate font-mono text-xs">
								{uploadedFileName}
							</Badge>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="encatch-log-input">Log text</Label>
						<Textarea
							id="encatch-log-input"
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
								if (uploadedFileName) setUploadedFileName(null);
							}}
							placeholder={'Paste logs here or upload a file above.\n{"timestamp":"2026-08-17T11:27:59.845999Z","fields":{"message":"..."},...}'}
							className="min-h-[180px] font-mono text-xs"
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={handleParse}>
							Parse logs
						</Button>
						<Button type="button" variant="outline" onClick={handleClear}>
							Clear
						</Button>
					</div>
				</CardContent>
			</Card>

			{parsed && (
				<>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						<StatCard label="Total" value={levelCounts.TOTAL} dotClass="bg-foreground" />
						<StatCard label="Info" value={levelCounts.INFO} dotClass="bg-blue-500" />
						<StatCard label="Warn" value={levelCounts.WARN} dotClass="bg-amber-500" />
						<StatCard label="Error" value={levelCounts.ERROR} dotClass="bg-red-500" />
						<StatCard label="Debug" value={levelCounts.DEBUG} dotClass="bg-slate-500" />
						<StatCard label="Trace" value={levelCounts.TRACE} dotClass="bg-violet-500" />
					</div>

					<Card className="overflow-hidden">
						<CardContent className="space-y-4 p-4">
							<div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
								<div className="space-y-1.5">
									<Label htmlFor="encatch-log-search">Search</Label>
									<Input
										id="encatch-log-search"
										value={search}
										onChange={(e) => {
											setSearch(e.target.value);
											setPage(1);
										}}
										placeholder="Search message, traceId, path, error..."
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Level</Label>
									<Select
										value={levelFilter}
										onValueChange={(value) => {
											setLevelFilter(value);
											setPage(1);
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="All levels" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All levels</SelectItem>
											{LOG_LEVELS.map((level) => (
												<SelectItem key={level} value={level}>
													{level}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label>Status</Label>
									<Select
										value={statusFilter}
										onValueChange={(value) => {
											setStatusFilter(value);
											setPage(1);
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="All status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All status</SelectItem>
											<SelectItem value="none">No status</SelectItem>
											{statusOptions.map((status) => (
												<SelectItem key={status} value={status}>
													{status}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="encatch-log-path">Path</Label>
									<Input
										id="encatch-log-path"
										value={pathFilter}
										onChange={(e) => {
											setPathFilter(e.target.value);
											setPage(1);
										}}
										placeholder="Filter path..."
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="encatch-log-service">Service</Label>
									<Input
										id="encatch-log-service"
										value={serviceFilter}
										onChange={(e) => {
											setServiceFilter(e.target.value);
											setPage(1);
										}}
										placeholder="Service..."
									/>
								</div>
								<Button type="button" variant="outline" onClick={clearFilters}>
									Clear filters
								</Button>
							</div>

							<div className="rounded-md border border-border/60">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/30 hover:bg-muted/30">
											<TableHead className="w-[170px]">Timestamp (IST)</TableHead>
											<TableHead className="w-[72px]">Level</TableHead>
											<TableHead className="w-[72px]">Status</TableHead>
											<TableHead className="w-[180px]">Path</TableHead>
											<TableHead className="w-[120px]">Trace ID</TableHead>
											<TableHead>Message</TableHead>
											<TableHead className="w-[140px]">Service</TableHead>
											<TableHead className="w-[120px]">Error</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginatedEntries.length === 0 ? (
											<TableRow>
												<TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
													No logs match the current filters.
												</TableCell>
											</TableRow>
										) : (
											paginatedEntries.map((entry) => (
												<TableRow
													key={entry.id}
													className="cursor-pointer"
													onClick={() => openEntry(entry)}
													title={`UTC: ${formatLogUtcTimestamp(entry.timestamp)}`}
												>
													<TableCell className="font-mono text-[11px] whitespace-normal">
														{formatLogTableTimestamp(entry.timestamp)}
													</TableCell>
													<TableCell>
														<LevelBadge level={entry.level} />
													</TableCell>
													<TableCell className="font-mono text-[11px]">{entry.status ?? "—"}</TableCell>
													<TableCell className="max-w-[180px] truncate font-mono text-[11px]" title={entry.path ?? undefined}>
														{entry.path ?? "—"}
													</TableCell>
													<TableCell className="max-w-[120px] truncate font-mono text-[11px]" title={entry.traceId ?? undefined}>
														{truncateText(entry.traceId, 12)}
													</TableCell>
													<TableCell className="max-w-[360px] truncate text-xs" title={entry.message ?? undefined}>
														{entry.message ?? "—"}
													</TableCell>
													<TableCell className="max-w-[140px] truncate font-mono text-[11px]" title={entry.service ?? undefined}>
														{entry.service ?? "—"}
													</TableCell>
													<TableCell className="max-w-[120px] truncate text-xs text-destructive" title={entry.error ?? undefined}>
														{entry.error ?? "—"}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={currentPage <= 1}
										onClick={() => setPage((p) => Math.max(1, p - 1))}
									>
										Prev
									</Button>
									<span className="text-sm text-muted-foreground">
										Page {currentPage} of {totalPages}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={currentPage >= totalPages}
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									>
										Next
									</Button>
								</div>

								<div className="flex items-center gap-2">
									<Select
										value={String(pageSize)}
										onValueChange={(value) => {
											setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
											setPage(1);
										}}
									>
										<SelectTrigger className="w-[120px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PAGE_SIZE_OPTIONS.map((size) => (
												<SelectItem key={size} value={String(size)}>
													{size} / page
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<span className="text-sm text-muted-foreground">{filteredEntries.length.toLocaleString()} results</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{parsed.skipped.length > 0 && (
						<Card className="border-border/60">
							<CardHeader>
								<CardTitle className="text-base">Skipped lines</CardTitle>
								<CardDescription>
									{parsed.skipped.length} non-JSON line(s) were ignored (e.g. labels like &quot;containing&quot; pasted
									from chat).
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								{parsed.skipped.map((item) => (
									<div key={`${item.line}-${item.text}`} className="rounded-md bg-muted/40 px-3 py-2 text-xs">
										<div className="font-medium text-muted-foreground">Line {item.line}</div>
										<div className="mt-1 font-mono break-all">{item.text}</div>
									</div>
								))}
							</CardContent>
						</Card>
					)}

					{parsed.errors.length > 0 && (
						<Card className="border-destructive/40">
							<CardHeader>
								<CardTitle className="text-base text-destructive">Parse errors</CardTitle>
								<CardDescription>{parsed.errors.length} line(s) could not be parsed.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								{parsed.errors.map((err) => (
									<div key={`${err.line}-${err.text}`} className="rounded-md bg-destructive/5 px-3 py-2 text-xs">
										<div className="font-semibold">
											Line {err.line}: {err.error}
										</div>
										<div className="mt-1 font-mono text-muted-foreground break-all">{err.text}</div>
									</div>
								))}
							</CardContent>
						</Card>
					)}
				</>
			)}

			<LogDetailDialog entry={selectedEntry} open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
