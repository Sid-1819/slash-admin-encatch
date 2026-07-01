import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Text } from "@/ui/typography";

export default function EncatchInstructionsPage() {
	return (
		<div className="flex flex-col gap-6 max-w-4xl">
			<div>
				<h2 className="text-2xl font-bold">Encatch SDK – How to Use</h2>
				<Text className="text-muted-foreground mt-1">Setup, configuration, and all available methods in this app.</Text>
			</div>

			{/* Setup */}
			<Card>
				<CardHeader>
					<CardTitle>1. Setup (API key & host)</CardTitle>
					<CardDescription>Do this on the login page before signing in.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ol className="list-decimal list-inside space-y-3 text-sm">
						<li>
							<strong>Go to the login page</strong> (log out if you’re already in).
						</li>
						<li>
							<strong>Encatch API key</strong> – Enter your Encatch API key (e.g. <code className="bg-muted px-1 rounded">en_dev_...</code>) in the “Encatch API
							key” field.
						</li>
						<li>
							<strong>Encatch host</strong> – Choose the environment from the dropdown:
							<ul className="list-disc list-inside mt-1 ml-2 text-muted-foreground">
								<li>
									<code>app.dev.encatch.com</code> – development
								</li>
								<li>
									<code>app.uat.encatch.com</code> – UAT (default)
								</li>
								<li>
									<code>app.encatch.com</code> – production
								</li>
							</ul>
						</li>
						<li>
							<strong>Click “Save Encatch config”</strong> – This writes the API key and host to localStorage.
						</li>
						<li>
							<strong>Hard refresh the app</strong> – Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+R</kbd> (Windows/Linux) or{" "}
							<kbd className="bg-muted px-1.5 py-0.5 rounded text-xs">Cmd+Shift+R</kbd> (Mac) so the SDK re-initializes with the new config. Without this, the
							previous host/API key may still be in use.
						</li>
						<li>Sign in as usual. Encatch will now use the saved API key and host for all requests.</li>
					</ol>
				</CardContent>
			</Card>

			{/* Optional: feedback form IDs */}
			<Card>
				<CardHeader>
					<CardTitle>2. Optional: Feedback form IDs</CardTitle>
					<CardDescription>
						You can set feedback form IDs on the login page (if your build supports it) or use the Encatch Test page to open forms by ID.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-sm">
					<p>
						Storage keys: <code className="bg-muted px-1 rounded">encatch_feedback_form_id_1</code>,{" "}
						<code className="bg-muted px-1 rounded">encatch_feedback_form_id_2</code>. Use{" "}
						<code className="bg-muted px-1 rounded">getEncatchFeedbackFormId1()</code> /{" "}
						<code className="bg-muted px-1 rounded">getEncatchFeedbackFormId2()</code> from <code className="bg-muted px-1 rounded">@/lib/encatch</code> when
						calling <code className="bg-muted px-1 rounded">_encatch.showForm(formId)</code>.
					</p>
				</CardContent>
			</Card>

			{/* Methods */}
			<Card>
				<CardHeader>
					<CardTitle>
						3. SDK methods (from <code className="text-sm">@/lib/encatch</code>)
					</CardTitle>
					<CardDescription>
						Import <code>_encatch</code> and optionally <code>mapTraitsToSdk</code> from <code>@/lib/encatch</code>. Call these after the app has loaded
						(EncatchProvider runs <code>initEncatch()</code> on mount).
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<div>
						<Text className="font-semibold">trackEvent(eventName: string)</Text>
						<Text className="text-muted-foreground">Track a custom event (e.g. button click, page action).</Text>
					</div>
					<div>
						<Text className="font-semibold">identifyUser(userId: string, traits?, options?)</Text>
						<Text className="text-muted-foreground">
							Identify the user. Use <code className="bg-muted px-1 rounded">mapTraitsToSdk(traits)</code> if you have <code>$set</code>, <code>$set_once</code>
							, <code>$increment</code>, etc.
						</Text>
					</div>
					<div>
						<Text className="font-semibold">showForm(formId: string, options?)</Text>
						<Text className="text-muted-foreground">
							Open a feedback form by ID. Options e.g. <code className="bg-muted px-1 rounded">{`{ reset: "always" | "on-complete" | "never" }`}</code>.
						</Text>
					</div>
					<div>
						<Text className="font-semibold">setTheme(theme: &quot;light&quot; | &quot;dark&quot; | &quot;system&quot;)</Text>
						<Text className="text-muted-foreground">Set Encatch UI theme.</Text>
					</div>
					<div>
						<Text className="font-semibold">setLocale(locale: string)</Text>
						<Text className="text-muted-foreground">
							Set language/locale (e.g. <code className="bg-muted px-1 rounded">en</code>, <code className="bg-muted px-1 rounded">fr</code>).
						</Text>
					</div>
					<div>
						<Text className="font-semibold">setCountry(country: string)</Text>
						<Text className="text-muted-foreground">
							Set country code (e.g. <code className="bg-muted px-1 rounded">US</code>).
						</Text>
					</div>
					<div>
						<Text className="font-semibold">trackScreen(screenName: string)</Text>
						<Text className="text-muted-foreground">Track current screen/page view.</Text>
					</div>
					<div>
						<Text className="font-semibold">startSession()</Text>
						<Text className="text-muted-foreground">Start a new session explicitly.</Text>
					</div>
					<div>
						<Text className="font-semibold">resetUser()</Text>
						<Text className="text-muted-foreground">Clear the identified user (e.g. on logout).</Text>
					</div>
					<div>
						<Text className="font-semibold">addToResponse(questionId: string, value: string | number | boolean)</Text>
						<Text className="text-muted-foreground">Prefill a form question before opening the form.</Text>
					</div>
					<div>
						<Text className="font-semibold">on(callback: (eventType, payload) =&gt; void) → unsubscribe</Text>
						<Text className="text-muted-foreground">Subscribe to SDK events (e.g. form opened/closed). Call the returned function to unsubscribe.</Text>
					</div>
				</CardContent>
			</Card>

			{/* After config change */}
			<Card>
				<CardHeader>
					<CardTitle>4. After changing API key or host</CardTitle>
					<CardDescription>Config is read only when the SDK initializes.</CardDescription>
				</CardHeader>
				<CardContent className="text-sm space-y-2">
					<p>
						If you change the API key or host on the login page and click “Save Encatch config”, you must <strong>hard refresh the page</strong> (or close the
						tab and open the app again) so that <code className="bg-muted px-1 rounded">initEncatch()</code> runs again with the new values. A normal refresh is
						usually enough; a hard refresh ensures no cached script keeps the old config.
					</p>
				</CardContent>
			</Card>

			{/* Test page link */}
			<Card>
				<CardHeader>
					<CardTitle>5. Try it out</CardTitle>
					<CardDescription>Use the Encatch Test page to call each method and see events in the log.</CardDescription>
				</CardHeader>
				<CardContent>
					<Link to="/encatch-test" className="text-primary hover:underline font-medium">
						Go to Encatch Test →
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
