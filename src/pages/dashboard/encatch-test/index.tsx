import { Icon } from "@/components/icon";
import { getEncatchFeedbackFormId1, getEncatchFeedbackFormId2, _encatch, mapTraitsToSdk } from "@/lib/encatch";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text } from "@/ui/typography";
import { useCallback, useEffect, useRef, useState } from "react";

type ResetMode = "always" | "on-complete" | "never";

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
	const [identifyUserId, setIdentifyUserId] = useState("user_123");
	const [identifyTraits, setIdentifyTraits] = useState('{"$set":{"email":"user_123@example.com","name":"Test User"}}');
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

	// Keep traits email in sync with user ID
	useEffect(() => {
		const email = `${(identifyUserId.trim() || "anonymous").replace(/\s+/g, "_")}@example.com`;
		setIdentifyTraits((prev) => {
			try {
				const parsed = JSON.parse(prev) as Record<string, unknown>;
				const set = (parsed.$set as Record<string, unknown>) ?? {};
				parsed.$set = { ...set, email };
				return JSON.stringify(parsed, null, 2);
			} catch {
				return JSON.stringify({ $set: { email } }, null, 2);
			}
		});
	}, [identifyUserId]);

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
			let traits: Record<string, unknown> | undefined;
			if (identifyTraits.trim()) {
				traits = JSON.parse(identifyTraits) as Record<string, unknown>;
			}
			_encatch.identifyUser(identifyUserId.trim() || "anonymous", mapTraitsToSdk(traits));
			setIdentifyResult(`Identify called for: ${identifyUserId.trim() || "anonymous"}`);
		} catch (e) {
			setIdentifyResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

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

				<Section
					title="identifyUser"
					description="Identify the current user. Traits support $set, $setOnce, $increment, $decrement, $unset (via mapTraitsToSdk)."
				>
					<div className="flex flex-col gap-2">
						<Label htmlFor="identify-user-id">User ID</Label>
						<Input id="identify-user-id" value={identifyUserId} onChange={(e) => setIdentifyUserId(e.target.value)} placeholder="user_123" />
						<Label htmlFor="identify-traits">Traits (JSON, optional)</Label>
						<textarea
							id="identify-traits"
							className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
							value={identifyTraits}
							onChange={(e) => setIdentifyTraits(e.target.value)}
							placeholder='{"$set":{"email":"..."}}'
						/>
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
