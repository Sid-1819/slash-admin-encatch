import { useSettings } from "@/store/settingStore";
import { useEffect } from "react";
import { HtmlDataAttribute } from "#/enum";

interface ThemeProviderProps {
	children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	const { themeMode, themeColorPresets, fontFamily, fontSize } = useSettings();

	useEffect(() => {
		const root = window.document.documentElement;
		root.setAttribute(HtmlDataAttribute.ThemeMode, themeMode);
	}, [themeMode]);

	useEffect(() => {
		const root = window.document.documentElement;
		root.setAttribute(HtmlDataAttribute.ColorPalette, themeColorPresets);
	}, [themeColorPresets]);

	useEffect(() => {
		const root = window.document.documentElement;
		root.style.fontSize = `${fontSize}px`;

		const body = window.document.body;
		body.style.fontFamily = fontFamily;
	}, [fontFamily, fontSize]);

	return <>{children}</>;
}
