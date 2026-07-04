import { Icon } from "@/components/icon";
import { useSettings } from "@/store/settingStore";
import { themeVars } from "@/theme/theme.css";
import { Toaster } from "sonner";

/**
 * https://sonner.emilkowal.ski/getting-started
 */
export default function Toast() {
	const { themeMode } = useSettings();

	return (
		<Toaster
			position="top-right"
			theme={themeMode}
			toastOptions={{
				duration: 3000,
				style: {
					backgroundColor: "var(--background)",
				},
				classNames: {
					toast: "rounded-lg border border-border font-semibold text-sm",
					description: "text-xs text-muted-foreground",
					content: "flex-1 ml-6",
					icon: "flex items-center justify-center rounded-lg",
					success: "bg-success/10",
					error: "bg-error/10",
					warning: "bg-warning/10",
					info: "bg-info/10",
					closeButton: "!top-0 !right-0 !left-auto border-dashed !border-border !bg-background",
					actionButton: "!bg-transparent !text-primary hover:!bg-primary/10",
					cancelButton: "!bg-transparent !text-foreground hover:!bg-foreground/10",
				},
			}}
			icons={{
				success: (
					<div className="p-2 bg-success/10 rounded-lg">
						<Icon icon="carbon:checkmark-filled" size={24} color={themeVars.colors.palette.success.default} />
					</div>
				),
				error: (
					<div className="p-2 bg-error/10 rounded-lg">
						<Icon icon="carbon:warning-hex-filled" size={24} color={themeVars.colors.palette.error.default} />
					</div>
				),
				warning: (
					<div className="p-2 bg-warning/10 rounded-lg">
						<Icon icon="carbon:warning-alt-filled" size={24} color={themeVars.colors.palette.warning.default} />
					</div>
				),
				info: (
					<div className="p-2 bg-info/10 rounded-lg">
						<Icon icon="carbon:information-filled" size={24} color={themeVars.colors.palette.info.default} />
					</div>
				),
				loading: (
					<div className="p-2 bg-gray-400/10 text-gray-400 rounded-lg">
						<Icon icon="svg-spinners:6-dots-scale-middle" size={24} speed={3} />
					</div>
				),
			}}
			expand
		/>
	);
}
