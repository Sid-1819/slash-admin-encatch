import { Icon } from "@/components/icon";
import { getEncatchFeedbackFormId1, getEncatchFeedbackFormId2, _encatch, mapTraitsToSdk } from "@/lib/encatch";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text } from "@/ui/typography";
import { useCallback, useEffect, useRef, useState } from "react";

type ResetMode = "always" | "on-complete" | "never";

type KeyValue = { key: string; value: string };
type KeyValueRow = KeyValue & { id: string };

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

interface EventLogEntry {
	eventType: string;
	payload: { formId?: string; timestamp: number; data?: Record<string, unknown> };
	at: string;
}

export default function EncatchTestPage() {
	// trackEvent
	const [trackEventName, setTrackEventName] = useState("test_event");
	const [trackResult, setTrackResult] = useState<string | null>(null);

	// identifyUser
	const [identifyUserName, setIdentifyUserName] = useState("user_123");
	// Simple trait fields (no JSON)
	const [identifySetEmail, setIdentifySetEmail] = useState("user_123@example.com");
	const [identifySetDisplayName, setIdentifySetDisplayName] = useState("Test User");
	const [identifySetExtra, setIdentifySetExtra] = useState<KeyValueRow[]>([]);
	const [identifySetOncePairs, setIdentifySetOncePairs] = useState<KeyValueRow[]>([]);
	const [identifyIncrementPairs, setIdentifyIncrementPairs] = useState<KeyValueRow[]>([]);
	const [identifyDecrementPairs, setIdentifyDecrementPairs] = useState<KeyValueRow[]>([]);
	const [identifyUnsetKeys, setIdentifyUnsetKeys] = useState("");
	// Options (collapsible)
	const [showIdentifyOptions, setShowIdentifyOptions] = useState(false);
	const [identifyLocale, setIdentifyLocale] = useState("");
	const [identifyCountry, setIdentifyCountry] = useState("");
	const [identifySecureSignature, setIdentifySecureSignature] = useState("");
	const [identifySecureTime, setIdentifySecureTime] = useState("");
	const [identifyResult, setIdentifyResult] = useState<string | null>(null);

	// setLocale
	const [language, setLanguage] = useState("en");
	const [languageResult, setLanguageResult] = useState<string | null>(null);

	// setCountry
	const [country, setCountry] = useState("US");
	const [countryResult, setCountryResult] = useState<string | null>(null);

	// trackScreen
	const [screenName, setScreenName] = useState("/dashboard/encatch-test");
	const [trackScreenResult, setTrackScreenResult] = useState<string | null>(null);

	// showForm (default from localStorage)
	const [feedbackFormId1, setFeedbackFormId1] = useState(() => getEncatchFeedbackFormId1());
	const [feedbackFormId2, setFeedbackFormId2] = useState(() => getEncatchFeedbackFormId2());
	const [resetMode1, setResetMode1] = useState<ResetMode>("always");
	const [resetMode2, setResetMode2] = useState<ResetMode>("always");
	const [showFormResult, setShowFormResult] = useState<string | null>(null);

	// addToResponse
	const [prefillQuestionId, setPrefillQuestionId] = useState("");
	const [prefillValue, setPrefillValue] = useState("");
	const [addToResponseResult, setAddToResponseResult] = useState<string | null>(null);

	// Session / reset
	const [sessionResult, setSessionResult] = useState<string | null>(null);
	const [resetUserResult, setResetUserResult] = useState<string | null>(null);

	// Event log (on callback)
	const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
	const eventLogRef = useRef<EventLogEntry[]>([]);
	const maxLogEntries = 20;

	const appendEvent = useCallback((eventType: string, payload: { formId?: string; timestamp: number; data?: Record<string, unknown> }) => {
		const entry: EventLogEntry = {
			eventType,
			payload,
			at: new Date().toISOString(),
		};
		eventLogRef.current = [entry, ...eventLogRef.current].slice(0, maxLogEntries);
		setEventLog(eventLogRef.current);
	}, []);

	useEffect(() => {
		const unsubscribe = _encatch.on((eventType, payload) => {
			appendEvent(eventType, payload);
		});
		return () => unsubscribe();
	}, [appendEvent]);

	// Build traits object from simple fields (for preview and submit)
	const identifyTraitsFromFields = useCallback((): Record<string, unknown> => {
		const traits: Record<string, unknown> = {};
		const setObj: Record<string, unknown> = {};
		if (identifySetEmail.trim()) setObj.email = identifySetEmail.trim();
		if (identifySetDisplayName.trim()) setObj.display_name = identifySetDisplayName.trim();
		for (const { key, value } of identifySetExtra) {
			if (key.trim()) setObj[key.trim()] = value.trim();
		}
		if (Object.keys(setObj).length > 0) traits.$set = setObj;

		const setOnceObj: Record<string, unknown> = {};
		for (const { key, value } of identifySetOncePairs) {
			if (key.trim()) setOnceObj[key.trim()] = value.trim();
		}
		if (Object.keys(setOnceObj).length > 0) traits.$setOnce = setOnceObj;

		const incObj: Record<string, number> = {};
		for (const { key, value } of identifyIncrementPairs) {
			if (key.trim()) {
				const n = Number(value.trim());
				if (!Number.isNaN(n)) incObj[key.trim()] = n;
			}
		}
		if (Object.keys(incObj).length > 0) traits.$increment = incObj;

		const decObj: Record<string, number> = {};
		for (const { key, value } of identifyDecrementPairs) {
			if (key.trim()) {
				const n = Number(value.trim());
				if (!Number.isNaN(n)) decObj[key.trim()] = n;
			}
		}
		if (Object.keys(decObj).length > 0) traits.$decrement = decObj;

		const unsetArr = identifyUnsetKeys
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (unsetArr.length > 0) traits.$unset = unsetArr;
		return traits;
	}, [identifySetEmail, identifySetDisplayName, identifySetExtra, identifySetOncePairs, identifyIncrementPairs, identifyDecrementPairs, identifyUnsetKeys]);

	const handleTrackEvent = () => {
		setTrackResult(null);
		try {
			_encatch.trackEvent(trackEventName.trim() || "unnamed_event");
			setTrackResult(`Track event fired: ${trackEventName.trim() || "unnamed_event"}`);
		} catch (e) {
			setTrackResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleIdentify = () => {
		setIdentifyResult(null);
		try {
			const traits = identifyTraitsFromFields();
			const options: { locale?: string; country?: string; secure?: { signature: string; generatedDateTimeinUTC?: string } } = {};
			if (identifyLocale.trim()) options.locale = identifyLocale.trim();
			if (identifyCountry.trim()) options.country = identifyCountry.trim();
			if (identifySecureSignature.trim()) {
				options.secure = {
					signature: identifySecureSignature.trim(),
					...(identifySecureTime.trim() && { generatedDateTimeinUTC: identifySecureTime.trim() }),
				};
			}
			const userName = identifyUserName.trim() || "anonymous";
			_encatch.identifyUser(userName, mapTraitsToSdk(Object.keys(traits).length ? traits : undefined), Object.keys(options).length > 0 ? options : undefined);
			setIdentifyResult(`Identify called for: ${userName}`);
		} catch (e) {
			setIdentifyResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	function addSetExtra() {
		setIdentifySetExtra((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function addSetOnce() {
		setIdentifySetOncePairs((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function addIncrement() {
		setIdentifyIncrementPairs((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function addDecrement() {
		setIdentifyDecrementPairs((prev) => [...prev, { key: "", value: "", id: crypto.randomUUID() }]);
	}
	function updateSetExtra(index: number, field: "key" | "value", val: string) {
		setIdentifySetExtra((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeSetExtra(index: number) {
		setIdentifySetExtra((prev) => prev.filter((_, i) => i !== index));
	}
	function updateSetOnce(index: number, field: "key" | "value", val: string) {
		setIdentifySetOncePairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeSetOnce(index: number) {
		setIdentifySetOncePairs((prev) => prev.filter((_, i) => i !== index));
	}
	function updateIncrement(index: number, field: "key" | "value", val: string) {
		setIdentifyIncrementPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeIncrement(index: number) {
		setIdentifyIncrementPairs((prev) => prev.filter((_, i) => i !== index));
	}
	function updateDecrement(index: number, field: "key" | "value", val: string) {
		setIdentifyDecrementPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
	}
	function removeDecrement(index: number) {
		setIdentifyDecrementPairs((prev) => prev.filter((_, i) => i !== index));
	}

	const handleSetTheme = (theme: "light" | "dark" | "system") => {
		try {
			_encatch.setTheme(theme);
		} catch (_) {}
	};

	const handleSetLocale = () => {
		setLanguageResult(null);
		try {
			_encatch.setLocale(language.trim() || "en");
			setLanguageResult(`Locale set to: ${language.trim() || "en"}`);
		} catch (e) {
			setLanguageResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleSetCountry = () => {
		setCountryResult(null);
		try {
			_encatch.setCountry(country.trim() || "US");
			setCountryResult(`Country set to: ${country.trim() || "US"}`);
		} catch (e) {
			setCountryResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleTrackScreen = () => {
		setTrackScreenResult(null);
		try {
			_encatch.trackScreen(screenName.trim() || window.location.href);
			setTrackScreenResult(`Screen tracked: ${screenName.trim() || window.location.href}`);
		} catch (e) {
			setTrackScreenResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleStartSession = () => {
		setSessionResult(null);
		try {
			_encatch.startSession();
			setSessionResult("Session started (ping interval + URL tracking enabled)");
		} catch (e) {
			setSessionResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleResetUser = () => {
		setResetUserResult(null);
		try {
			_encatch.resetUser();
			setResetUserResult("User reset (anonymous; session cleared)");
		} catch (e) {
			setResetUserResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleOpenForm1 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId1.trim() || getEncatchFeedbackFormId1();
			_encatch.showForm(formId, { reset: resetMode1 });
			setShowFormResult(`Form 1 opened (${formId}) with reset=${resetMode1}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleOpenForm2 = () => {
		setShowFormResult(null);
		try {
			const formId = feedbackFormId2.trim() || getEncatchFeedbackFormId2();
			_encatch.showForm(formId, { reset: resetMode2 });
			setShowFormResult(`Form 2 opened (${formId}) with reset=${resetMode2}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleAddToResponse = () => {
		setAddToResponseResult(null);
		try {
			const qId = prefillQuestionId.trim();
			if (!qId) {
				setAddToResponseResult("Error: question ID is required");
				return;
			}
			const value = prefillValue.trim() || prefillValue;
			_encatch.addToResponse(qId, value);
			setAddToResponseResult(`Prefill set: ${qId} = ${JSON.stringify(value)}`);
		} catch (e) {
			setAddToResponseResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:bug-minimalistic-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch SDK Test</h2>
					<Text variant="body2" className="text-muted-foreground">
						Test all @encatch/web-sdk methods via _encatch. Ensure Encatch is initialized (e.g. via EncatchProvider).
					</Text>
				</div>
			</div>

			{/* Event log from _encatch.on() */}
			<Section
				title="on (event subscription)"
				description="Subscribe to form/SDK events. Last events appear below (form:show, form:complete, form:close, etc.)."
			>
				<div className="flex flex-col gap-2">
					<Text variant="caption" className="text-muted-foreground">
						Events received:
					</Text>
					{eventLog.length === 0 ? (
						<Text variant="caption" className="text-muted-foreground italic">
							No events yet. Open a form or interact to see events.
						</Text>
					) : (
						<ul className="max-h-48 overflow-y-auto rounded border border-input bg-muted/30 p-2 font-mono text-xs">
							{eventLog.map((entry, i) => (
								<li key={`${entry.at}-${i}`} className="flex flex-col gap-0.5 py-1">
									<span className="font-semibold text-foreground">{entry.eventType}</span>
									<span className="text-muted-foreground">
										{entry.payload.formId != null ? `formId: ${entry.payload.formId}` : ""}
										{entry.payload.data != null ? ` | data: ${JSON.stringify(entry.payload.data)}` : ""}
									</span>
									<span className="text-muted-foreground/70">{entry.at}</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</Section>

			<div className="grid gap-4 md:grid-cols-2">
				<Section
					title="trackEvent & trackScreen"
					description="Fire a custom event or track a screen view. Screen tracking can be automatic after startSession()."
				>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="track-event-name">Event name</Label>
							<div className="flex gap-2">
								<Input
									id="track-event-name"
									value={trackEventName}
									onChange={(e) => setTrackEventName(e.target.value)}
									placeholder="e.g. button_clicked"
									className="flex-1"
								/>
								<Button onClick={handleTrackEvent}>Fire event</Button>
							</div>
							{trackResult && (
								<Text variant="caption" className="text-muted-foreground">
									{trackResult}
								</Text>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="screen-name">Screen name</Label>
							<div className="flex gap-2">
								<Input
									id="screen-name"
									value={screenName}
									onChange={(e) => setScreenName(e.target.value)}
									placeholder="/dashboard/encatch-test"
									className="flex-1"
								/>
								<Button variant="outline" onClick={handleTrackScreen}>
									Track screen
								</Button>
							</div>
							{trackScreenResult && (
								<Text variant="caption" className="text-muted-foreground">
									{trackScreenResult}
								</Text>
							)}
						</div>
					</div>
				</Section>

				<Section title="identifyUser" description="Identify the current user. Fill simple fields; generated traits JSON is shown below.">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="identify-user-name">User name</Label>
							<Input id="identify-user-name" value={identifyUserName} onChange={(e) => setIdentifyUserName(e.target.value)} placeholder="user_123" />
						</div>

						{/* Traits: simple fields */}
						<div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
							<Text variant="caption" className="font-medium text-foreground">
								Traits
							</Text>
							<div className="grid gap-2 sm:grid-cols-2">
								<div className="flex flex-col gap-1">
									<Label htmlFor="identify-set-email" className="text-xs">
										$set — email
									</Label>
									<Input id="identify-set-email" value={identifySetEmail} onChange={(e) => setIdentifySetEmail(e.target.value)} placeholder="a@b.com" />
								</div>
								<div className="flex flex-col gap-1">
									<Label htmlFor="identify-set-display-name" className="text-xs">
										$set — display_name
									</Label>
									<Input
										id="identify-set-display-name"
										value={identifySetDisplayName}
										onChange={(e) => setIdentifySetDisplayName(e.target.value)}
										placeholder="Test User"
									/>
								</div>
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$set — extra (key / value)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addSetExtra}>
										Add row
									</Button>
								</div>
								{identifySetExtra.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateSetExtra(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input placeholder="value" value={row.value} onChange={(e) => updateSetExtra(i, "value", e.target.value)} className="font-mono text-sm" />
										<Button type="button" variant="ghost" size="sm" onClick={() => removeSetExtra(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$setOnce (key / value)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addSetOnce}>
										Add row
									</Button>
								</div>
								{identifySetOncePairs.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateSetOnce(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input placeholder="value" value={row.value} onChange={(e) => updateSetOnce(i, "value", e.target.value)} className="font-mono text-sm" />
										<Button type="button" variant="ghost" size="sm" onClick={() => removeSetOnce(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$increment (key / number)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addIncrement}>
										Add row
									</Button>
								</div>
								{identifyIncrementPairs.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateIncrement(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input
											type="number"
											placeholder="value"
											value={row.value}
											onChange={(e) => updateIncrement(i, "value", e.target.value)}
											className="font-mono text-sm"
										/>
										<Button type="button" variant="ghost" size="sm" onClick={() => removeIncrement(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs">$decrement (key / number)</Label>
									<Button type="button" variant="outline" size="sm" onClick={addDecrement}>
										Add row
									</Button>
								</div>
								{identifyDecrementPairs.map((row, i) => (
									<div key={row.id} className="flex gap-2">
										<Input placeholder="key" value={row.key} onChange={(e) => updateDecrement(i, "key", e.target.value)} className="font-mono text-sm" />
										<Input
											type="number"
											placeholder="value"
											value={row.value}
											onChange={(e) => updateDecrement(i, "value", e.target.value)}
											className="font-mono text-sm"
										/>
										<Button type="button" variant="ghost" size="sm" onClick={() => removeDecrement(i)}>
											Remove
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-col gap-1">
								<Label htmlFor="identify-unset-keys" className="text-xs">
									$unset — keys to remove (comma-separated)
								</Label>
								<Input
									id="identify-unset-keys"
									value={identifyUnsetKeys}
									onChange={(e) => setIdentifyUnsetKeys(e.target.value)}
									placeholder="oldField, otherField"
								/>
							</div>
						</div>

						{/* Generated traits JSON (read-only) */}
						<div className="flex flex-col gap-1.5">
							<Label className="text-muted-foreground text-xs">Generated traits JSON</Label>
							<pre className="min-h-[80px] w-full overflow-auto rounded-md border border-input bg-muted/30 p-3 text-xs font-mono text-muted-foreground">
								{JSON.stringify(identifyTraitsFromFields(), null, 2)}
							</pre>
						</div>

						{/* Options: show/hide */}
						<div className="flex flex-col gap-2">
							<Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShowIdentifyOptions((v) => !v)}>
								{showIdentifyOptions ? "Hide options" : "Show options"}
							</Button>
							{showIdentifyOptions && (
								<div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
									<Text variant="caption" className="font-medium text-foreground">
										Options (locale, country, secure)
									</Text>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="flex flex-col gap-1">
											<Label htmlFor="identify-locale" className="text-xs">
												locale
											</Label>
											<Input id="identify-locale" value={identifyLocale} onChange={(e) => setIdentifyLocale(e.target.value)} placeholder="en" />
										</div>
										<div className="flex flex-col gap-1">
											<Label htmlFor="identify-country" className="text-xs">
												country
											</Label>
											<Input id="identify-country" value={identifyCountry} onChange={(e) => setIdentifyCountry(e.target.value)} placeholder="US" />
										</div>
									</div>
									<div className="flex flex-col gap-1">
										<Label htmlFor="identify-secure-sig" className="text-xs">
											secure.signature
										</Label>
										<Input
											id="identify-secure-sig"
											value={identifySecureSignature}
											onChange={(e) => setIdentifySecureSignature(e.target.value)}
											placeholder="Optional signature"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<Label htmlFor="identify-secure-time" className="text-xs">
											secure.generatedDateTimeinUTC
										</Label>
										<Input
											id="identify-secure-time"
											value={identifySecureTime}
											onChange={(e) => setIdentifySecureTime(e.target.value)}
											placeholder="Optional ISO datetime UTC"
										/>
									</div>
								</div>
							)}
						</div>

						<Button onClick={handleIdentify}>Identify user</Button>
						{identifyResult && (
							<Text variant="caption" className="text-muted-foreground">
								{identifyResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="setTheme, setLocale, setCountry" description="Theme for Encatch UI; locale and country for form content and localization.">
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Label className="text-muted-foreground text-xs shrink-0">Theme</Label>
							<Button variant="outline" size="sm" onClick={() => handleSetTheme("light")}>
								Light
							</Button>
							<Button variant="outline" size="sm" onClick={() => handleSetTheme("dark")}>
								Dark
							</Button>
							<Button variant="outline" size="sm" onClick={() => handleSetTheme("system")}>
								System
							</Button>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="language" className="text-muted-foreground text-xs shrink-0">
								Locale
							</Label>
							<Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="w-20" />
							<Button size="sm" onClick={handleSetLocale}>
								Set
							</Button>
							{languageResult && (
								<Text variant="caption" className="text-muted-foreground">
									{languageResult}
								</Text>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Label htmlFor="country" className="text-muted-foreground text-xs shrink-0">
								Country
							</Label>
							<Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" className="w-20" />
							<Button size="sm" onClick={handleSetCountry}>
								Set
							</Button>
							{countryResult && (
								<Text variant="caption" className="text-muted-foreground">
									{countryResult}
								</Text>
							)}
						</div>
					</div>
				</Section>

				<Section title="startSession & resetUser" description="Start session (ping + URL tracking) or clear user/session (e.g. on logout).">
					<div className="flex flex-col gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Button onClick={handleStartSession}>Start session</Button>
							<Button variant="outline" onClick={handleResetUser}>
								Reset user
							</Button>
						</div>
						{(sessionResult || resetUserResult) && (
							<Text variant="caption" className="text-muted-foreground">
								{sessionResult ?? resetUserResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="showForm" description="Open a form by configuration ID. Reset mode: always (default), on-complete, or never.">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="feedback-id-1">Form ID 1</Label>
							<div className="flex flex-wrap items-end gap-2">
								<Input
									id="feedback-id-1"
									value={feedbackFormId1}
									onChange={(e) => setFeedbackFormId1(e.target.value)}
									placeholder={getEncatchFeedbackFormId1() || "Set on login screen"}
									className="flex-1 min-w-[120px]"
								/>
								<div className="flex items-center gap-2 shrink-0">
									<Label htmlFor="reset-mode-1" className="text-muted-foreground text-xs whitespace-nowrap">
										Reset
									</Label>
									<select
										id="reset-mode-1"
										className="rounded-md border border-input bg-background px-3 py-2 text-sm w-[130px]"
										value={resetMode1}
										onChange={(e) => setResetMode1(e.target.value as ResetMode)}
									>
										<option value="always">always</option>
										<option value="on-complete">on-complete</option>
										<option value="never">never</option>
									</select>
								</div>
								<Button onClick={handleOpenForm1}>Open form 1</Button>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="feedback-id-2">Form ID 2</Label>
							<div className="flex flex-wrap items-end gap-2">
								<Input
									id="feedback-id-2"
									value={feedbackFormId2}
									onChange={(e) => setFeedbackFormId2(e.target.value)}
									placeholder={getEncatchFeedbackFormId2() || "Set on login screen"}
									className="flex-1 min-w-[120px]"
								/>
								<div className="flex items-center gap-2 shrink-0">
									<Label htmlFor="reset-mode-2" className="text-muted-foreground text-xs whitespace-nowrap">
										Reset
									</Label>
									<select
										id="reset-mode-2"
										className="rounded-md border border-input bg-background px-3 py-2 text-sm w-[130px]"
										value={resetMode2}
										onChange={(e) => setResetMode2(e.target.value as ResetMode)}
									>
										<option value="always">always</option>
										<option value="on-complete">on-complete</option>
										<option value="never">never</option>
									</select>
								</div>
								<Button onClick={handleOpenForm2}>Open form 2</Button>
							</div>
						</div>
						{showFormResult && (
							<Text variant="caption" className="text-muted-foreground">
								{showFormResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="addToResponse" description="Prefill a form question by ID. Stored for current and future showForm(); also sent to visible iframes.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="prefill-question-id">Question ID</Label>
						<Input
							id="prefill-question-id"
							value={prefillQuestionId}
							onChange={(e) => setPrefillQuestionId(e.target.value)}
							placeholder="e.g. email or question slug"
						/>
						<Label htmlFor="prefill-value">Value</Label>
						<Input id="prefill-value" value={prefillValue} onChange={(e) => setPrefillValue(e.target.value)} placeholder="Value to prefill" />
						<Button onClick={handleAddToResponse}>Add to response</Button>
						{addToResponseResult && (
							<Text variant="caption" className="text-muted-foreground">
								{addToResponseResult}
							</Text>
						)}
					</div>
				</Section>
			</div>

			<Section
				title="init"
				description="init(apiKey, config) is called once by EncatchProvider on app load. API key and feedback form ID are set on the login screen (Encatch section)."
			>
				<Text variant="caption" className="text-muted-foreground">
					Set the Encatch API key and feedback form ID on the login screen, then reload. EncatchProvider initializes the SDK from localStorage.
				</Text>
			</Section>
		</div>
	);
}
