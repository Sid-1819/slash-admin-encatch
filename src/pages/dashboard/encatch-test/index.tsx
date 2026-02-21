import { Icon } from "@/components/icon";
import { ENCATCH_FEEDBACK_FORM_ID, _encatch, mapTraitsToSdk } from "@/lib/encatch";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text } from "@/ui/typography";
import { useEffect, useState } from "react";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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

export default function EncatchTestPage() {
	const [trackEventName, setTrackEventName] = useState("test_event");
	const [trackResult, setTrackResult] = useState<string | null>(null);

	const [identifyUserId, setIdentifyUserId] = useState("user_123");
	const [identifyTraits, setIdentifyTraits] = useState('{"$set":{"email":"user_123@example.com","name":"Test User"}}');
	const [identifyResult, setIdentifyResult] = useState<string | null>(null);

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

	const [language, setLanguage] = useState("en");
	const [languageResult, setLanguageResult] = useState<string | null>(null);

	const [feedbackFormId, setFeedbackFormId] = useState(ENCATCH_FEEDBACK_FORM_ID);

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

	const handleSetTheme = (theme: "light" | "dark") => {
		try {
			_encatch.setTheme(theme);
		} catch (_) {}
	};

	const handleSetLanguage = () => {
		setLanguageResult(null);
		try {
			_encatch.setLocale(language.trim() || "en");
			setLanguageResult(`Locale set to: ${language.trim() || "en"}`);
		} catch (e) {
			setLanguageResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleOpenFeedback = () => {
		try {
			_encatch.showForm(feedbackFormId.trim() || ENCATCH_FEEDBACK_FORM_ID);
		} catch (_) {}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:bug-minimalistic-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Encatch SDK Test</h2>
					<Text variant="body2" className="text-muted-foreground">
						Test @encatch/web-sdk directly via _encatch. Ensure Encatch is initialized (e.g. via EncatchProvider).
					</Text>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Section title="trackEvent" description="Fire a track event. SDK accepts event name only.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="track-event-name">Event name</Label>
						<Input id="track-event-name" value={trackEventName} onChange={(e) => setTrackEventName(e.target.value)} placeholder="e.g. button_clicked" />
						<Button onClick={handleTrackEvent}>Submit (fire track event)</Button>
						{trackResult && (
							<Text variant="caption" className="text-muted-foreground">
								{trackResult}
							</Text>
						)}
					</div>
				</Section>

				<Section
					title="identifyUser"
					description="Identify the current user. Traits JSON supports $set, $setOnce, $increment, $unset (mapped via mapTraitsToSdk)."
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
						<Button onClick={handleIdentify}>Submit (identify user)</Button>
						{identifyResult && (
							<Text variant="caption" className="text-muted-foreground">
								{identifyResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="setTheme" description="Set Encatch UI theme (light, dark, or system).">
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => handleSetTheme("light")}>
							Light
						</Button>
						<Button variant="outline" onClick={() => handleSetTheme("dark")}>
							Dark
						</Button>
					</div>
				</Section>

				<Section title="setLocale" description="Set Encatch locale/language.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="language">Language code</Label>
						<Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
						<Button onClick={handleSetLanguage}>Submit (set locale)</Button>
						{languageResult && (
							<Text variant="caption" className="text-muted-foreground">
								{languageResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="showForm" description="Open the feedback form by configuration ID. Default from ENCATCH_FEEDBACK_FORM_ID.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="feedback-id">Feedback configuration ID</Label>
						<Input id="feedback-id" value={feedbackFormId} onChange={(e) => setFeedbackFormId(e.target.value)} placeholder={ENCATCH_FEEDBACK_FORM_ID} />
						<Button onClick={handleOpenFeedback}>Open feedback form</Button>
					</div>
				</Section>

				<Section
					title="Not in SDK"
					description="openFeedbackByName, verifyFeedbackIds, forceFetchEligibleFeedbacks, capturePageScrollEvent are not part of @encatch/web-sdk."
				>
					<Text variant="caption" className="text-muted-foreground">
						Use showForm with a form ID instead of openFeedbackByName.
					</Text>
				</Section>
			</div>
		</div>
	);
}
