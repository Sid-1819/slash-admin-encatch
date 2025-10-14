import userService from "@/api/services/userService";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function RegisterForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();

	const signUpMutation = useMutation({
		mutationFn: userService.signup,
	});

	const form = useForm({
		defaultValues: {
			username: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	// State for dynamic fields
	const [customFields, setCustomFields] = useState([{ id: crypto.randomUUID(), key: "", value: "" }]);

	// Add a new empty field
	const handleAddField = () => {
		setCustomFields([...customFields, { id: crypto.randomUUID(), key: "", value: "" }]);
	};

	// Remove a field by index
	const handleRemoveField = (idx: number) => {
		setCustomFields(customFields.filter((_, i) => i !== idx));
	};

	// Update a field's key or value
	const handleFieldChange = (idx: number, type: "key" | "value", val: string) => {
		const updated = [...customFields];
		updated[idx][type] = val;
		setCustomFields(updated);
	};

	const onFinish = async (values: any) => {
		// Merge custom fields into values
		const extraFields = customFields.reduce(
			(acc, { key, value }) => {
				if (key) acc[key] = value;
				return acc;
			},
			{} as Record<string, string>,
		);
		const submitValues = { ...values, ...extraFields };
		console.log("Received values of form: ", submitValues);
		await signUpMutation.mutateAsync(submitValues);

		// encatch: set identity with all registration details
		if (submitValues.username !== "guest" && window.encatch && typeof window.encatch.identify === "function") {
			const { username, password, confirmPassword, ...traits } = submitValues;
			console.log("Traits for encatch:", traits);

			window.encatch.identify(username, traits);
		}

		// Track registration event
		if (window.encatch && typeof window.encatch.trackEvent === "function") {
			window.encatch.trackEvent("user_registered", {
				username: submitValues.username,
				email: submitValues.email,
				hasCustomFields: Object.keys(extraFields).length > 0,
			});
		}

		backToLogin();
	};

	if (loginState !== LoginStateEnum.REGISTER) return null;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{t("sys.login.signUpFormTitle")}</h1>
				</div>

				<FormField
					control={form.control}
					name="username"
					rules={{ required: t("sys.login.accountPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input placeholder={t("sys.login.userName")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="email"
					rules={{ required: t("sys.login.emaildPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input placeholder={t("sys.login.email")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="password"
					rules={{ required: t("sys.login.passwordPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input type="password" placeholder={t("sys.login.password")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="confirmPassword"
					rules={{
						required: t("sys.login.confirmPasswordPlaceholder"),
						validate: (value) => value === form.getValues("password") || t("sys.login.diffPwd"),
					}}
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input type="password" placeholder={t("sys.login.confirmPassword")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Dynamic custom fields */}
				<div>
					<label className="block font-medium mb-1" htmlFor="custom-field-key-0">
						Add Extra Fields (optional)
					</label>
					{customFields.map((field, idx) => (
						<div key={field.id} className="flex gap-2 mb-2">
							<Input
								id={`custom-field-key-${idx}`}
								placeholder="Key (e.g. user_email, age)"
								value={field.key}
								onChange={(e) => handleFieldChange(idx, "key", e.target.value)}
								className="w-1/2"
							/>
							<Input placeholder="Value" value={field.value} onChange={(e) => handleFieldChange(idx, "value", e.target.value)} className="w-1/2" />
							<Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveField(idx)} disabled={customFields.length === 1}>
								Remove
							</Button>
						</div>
					))}
					<Button type="button" variant="outline" size="sm" onClick={handleAddField}>
						Add Field
					</Button>
				</div>

				<Button type="submit" className="w-full">
					{t("sys.login.registerButton")}
				</Button>

				<div className="mb-2 text-xs text-gray">
					<span>{t("sys.login.registerAndAgree")}</span>
					<a href="./" className="text-sm underline! text-primary!">
						{t("sys.login.termsOfService")}
					</a>
					{" & "}
					<a href="./" className="text-sm underline! text-primary!">
						{t("sys.login.privacyPolicy")}
					</a>
				</div>

				<ReturnButton onClick={backToLogin} />
			</form>
		</Form>
	);
}

export default RegisterForm;
