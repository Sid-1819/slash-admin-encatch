import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text } from "@/ui/typography";
import { useState } from "react";
import _refiner from "refiner-js";

const DEFAULT_PROJECT_UUID = "88f6d7f0-8a16-11f0-bbfa-052e1a97567e";
const DEFAULT_FORM_UUID = "e5de53c0-e000-11f0-bed2-43c154a2df6d";

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

export default function RefinerTestPage() {
	const [projectUuid, setProjectUuid] = useState(DEFAULT_PROJECT_UUID);
	const [setProjectResult, setSetProjectResult] = useState<string | null>(null);

	const [identifyId, setIdentifyId] = useState("user_123");
	const [identifyEmail, setIdentifyEmail] = useState("user@example.com");
	const [identifyName, setIdentifyName] = useState("Test User");
	const [identifyResult, setIdentifyResult] = useState<string | null>(null);

	const [formUuid, setFormUuid] = useState(DEFAULT_FORM_UUID);
	const [showFormResult, setShowFormResult] = useState<string | null>(null);

	const handleSetProject = () => {
		setSetProjectResult(null);
		try {
			const uuid = projectUuid.trim() || DEFAULT_PROJECT_UUID;
			_refiner("setProject", uuid);
			setSetProjectResult(`Project set: ${uuid}`);
		} catch (e) {
			setSetProjectResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleIdentifyUser = () => {
		setIdentifyResult(null);
		try {
			const payload: { id: string; email?: string; name?: string } = {
				id: identifyId.trim() || "anonymous",
			};
			if (identifyEmail.trim()) payload.email = identifyEmail.trim();
			if (identifyName.trim()) payload.name = identifyName.trim();
			_refiner("identifyUser", payload);
			setIdentifyResult(`Identified: ${payload.id}`);
		} catch (e) {
			setIdentifyResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const handleShowForm = () => {
		setShowFormResult(null);
		try {
			const uuid = formUuid.trim() || DEFAULT_FORM_UUID;
			_refiner("showForm", uuid);
			setShowFormResult(`Form opened: ${uuid}`);
		} catch (e) {
			setShowFormResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Icon icon="solar:bug-minimalistic-bold-duotone" size={28} />
				<div>
					<h2 className="text-2xl font-bold">Refiner SDK Test</h2>
					<Text variant="body2" className="text-muted-foreground">
						Test Refiner via <code className="rounded bg-muted px-1">_refiner</code>. Refiner is not initialized in App — call Set project first, then identify
						or show form.
					</Text>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Section title="setProject" description="Required before any other Refiner call. Sets the project UUID.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="project-uuid">Project UUID</Label>
						<div className="flex gap-2">
							<Input
								id="project-uuid"
								value={projectUuid}
								onChange={(e) => setProjectUuid(e.target.value)}
								placeholder={DEFAULT_PROJECT_UUID}
								className="flex-1 font-mono text-sm"
							/>
							<Button onClick={handleSetProject}>Set project</Button>
						</div>
						{setProjectResult && (
							<Text variant="caption" className="text-muted-foreground">
								{setProjectResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="identifyUser" description="Identify the current user. Links form responses to the account.">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="identify-id">User ID</Label>
							<Input id="identify-id" value={identifyId} onChange={(e) => setIdentifyId(e.target.value)} placeholder="user_123" />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="identify-email">Email (optional)</Label>
							<Input id="identify-email" type="email" value={identifyEmail} onChange={(e) => setIdentifyEmail(e.target.value)} placeholder="user@example.com" />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="identify-name">Name (optional)</Label>
							<Input id="identify-name" value={identifyName} onChange={(e) => setIdentifyName(e.target.value)} placeholder="Test User" />
						</div>
						<Button onClick={handleIdentifyUser}>Identify user</Button>
						{identifyResult && (
							<Text variant="caption" className="text-muted-foreground">
								{identifyResult}
							</Text>
						)}
					</div>
				</Section>

				<Section title="showForm" description="Manually trigger a form by UUID. Bypasses automatic trigger rules.">
					<div className="flex flex-col gap-2">
						<Label htmlFor="form-uuid">Form UUID</Label>
						<div className="flex gap-2">
							<Input
								id="form-uuid"
								value={formUuid}
								onChange={(e) => setFormUuid(e.target.value)}
								placeholder={DEFAULT_FORM_UUID}
								className="flex-1 font-mono text-sm"
							/>
							<Button onClick={handleShowForm}>Show form</Button>
						</div>
						{showFormResult && (
							<Text variant="caption" className="text-muted-foreground">
								{showFormResult}
							</Text>
						)}
					</div>
				</Section>
			</div>

			<Section
				title="Init"
				description="Refiner is currently commented out in App.tsx. Use this page to set project and test identify/showForm without enabling it globally."
			>
				<Text variant="caption" className="text-muted-foreground">
					Project UUID and Form UUID defaults are from docs/REFINER_INTEGRATION.md. Call setProject first, then identifyUser and/or showForm as needed.
				</Text>
			</Section>
		</div>
	);
}
