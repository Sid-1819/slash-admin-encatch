import { DB_USER } from "@/_mock/assets_backup";
import type { SignInReq } from "@/api/services/userService";
import { Icon } from "@/components/icon";
import { GLOBAL_CONFIG } from "@/global-config";
import { ENCATCH_STORAGE_KEYS, _encatch } from "@/lib/encatch";
import { useSignIn } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [remember, setRemember] = useState(true);
	const [encatchApiKey, setEncatchApiKey] = useState("");
	const navigatge = useNavigate();

	const { loginState, setLoginState } = useLoginStateContext();
	const signIn = useSignIn();

	const form = useForm<SignInReq>({
		defaultValues: {
			username: DB_USER[0].username,
		},
	});

	// Load Encatch API key from localStorage on mount
	useEffect(() => {
		try {
			setEncatchApiKey(localStorage.getItem(ENCATCH_STORAGE_KEYS.API_KEY) ?? "");
		} catch {
			// ignore
		}
	}, []);

	const saveEncatchConfig = () => {
		try {
			localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, encatchApiKey.trim());
			toast.success("Encatch config saved. Reload the app to apply.");
		} catch {
			toast.error("Failed to save Encatch config.");
		}
	};

	if (loginState !== LoginStateEnum.LOGIN) return null;

	const handleFinish = async (values: SignInReq) => {
		try {
			localStorage.setItem(ENCATCH_STORAGE_KEYS.API_KEY, encatchApiKey.trim());
		} catch {
			// ignore
		}
		setLoading(true);
		try {
			await signIn(values);
			navigatge(GLOBAL_CONFIG.defaultRoute, { replace: true });
			toast.success("Sign in success!", {
				closeButton: true,
			});
		} finally {
			setLoading(false);
			_encatch.trackEvent("user_logged_in");
		}
	};

	const handleGuestLogin = async () => {
		setLoading(true);
		try {
			await signIn({ username: "guest" });
			navigatge(GLOBAL_CONFIG.defaultRoute, { replace: true });
			toast.success("Sign in success!", {
				closeButton: true,
			});
		} finally {
			setLoading(false);
			_encatch.trackEvent("guest_logged_in");
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<Form {...form} {...props}>
				<form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.signInFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">{t("sys.login.signInFormDescription")}</p>
					</div>

					<FormField
						control={form.control}
						name="username"
						rules={{ required: t("sys.login.accountPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.userName")}</FormLabel>
								<FormControl>
									<Input placeholder={DB_USER.map((user) => user.username).join("/")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Encatch API key */}
					<div className="space-y-2">
						<Label htmlFor="encatch-api-key">Encatch API key</Label>
						<Input
							id="encatch-api-key"
							type="text"
							placeholder="e.g. en_dev_..."
							value={encatchApiKey}
							onChange={(e) => setEncatchApiKey(e.target.value)}
							autoComplete="off"
						/>
						<Button type="button" variant="outline" size="sm" onClick={saveEncatchConfig}>
							Save Encatch config
						</Button>
					</div>

					{/* 记住我 */}
					<div className="flex items-center space-x-2">
						<Checkbox id="remember" checked={remember} onCheckedChange={(checked) => setRemember(checked === "indeterminate" ? false : checked)} />
						<label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
							{t("sys.login.rememberMe")}
						</label>
					</div>

					{/* 登录按钮 */}
					<Button type="submit" className="w-full" disabled={loading}>
						{loading && <Loader2 className="animate-spin mr-2" />}
						{t("sys.login.loginButton")}
					</Button>

					{/* Guest Login */}
					<Button type="button" variant="outline" className="w-full" onClick={handleGuestLogin} disabled={loading}>
						{loading && <Loader2 className="animate-spin mr-2" />}
						{t("sys.login.guestLogin")}
					</Button>

					{/* 手机登录/二维码登录 */}
					<div className="grid gap-4 sm:grid-cols-2">
						<Button variant="outline" className="w-full" onClick={() => setLoginState(LoginStateEnum.MOBILE)}>
							<Icon icon="uil:mobile-android" size={20} />
							{t("sys.login.mobileSignInFormTitle")}
						</Button>
						<Button variant="outline" className="w-full" onClick={() => setLoginState(LoginStateEnum.QR_CODE)}>
							<Icon icon="uil:qrcode-scan" size={20} />
							{t("sys.login.qrSignInFormTitle")}
						</Button>
					</div>

					{/* 其他登录方式 */}
					<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
						<span className="relative z-10 bg-background px-2 text-muted-foreground">{t("sys.login.otherSignIn")}</span>
					</div>
					<div className="flex cursor-pointer justify-around text-2xl">
						<Button variant="ghost" size="icon">
							<Icon icon="mdi:github" size={24} />
						</Button>
						<Button variant="ghost" size="icon">
							<Icon icon="mdi:wechat" size={24} />
						</Button>
						<Button variant="ghost" size="icon">
							<Icon icon="ant-design:google-circle-filled" size={24} />
						</Button>
					</div>

					{/* 注册 */}
					<div className="text-center text-sm">
						{t("sys.login.noAccount")}
						<Button variant="link" className="px-1" onClick={() => setLoginState(LoginStateEnum.REGISTER)}>
							{t("sys.login.signUpFormTitle")}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}

export default LoginForm;
