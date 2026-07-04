import "dayjs/locale/zh-cn";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { LocalEnum } from "#/enum";

type Locale = keyof typeof LocalEnum;
type Language = {
	locale: keyof typeof LocalEnum;
	icon: string;
	label: string;
};

export const LANGUAGE_MAP: Record<Locale, Language> = {
	[LocalEnum.zh_CN]: {
		locale: LocalEnum.zh_CN,
		label: "Chinese",
		icon: "flag-cn",
	},
	[LocalEnum.en_US]: {
		locale: LocalEnum.en_US,
		label: "English",
		icon: "flag-us",
	},
};

export default function useLocale() {
	const { t, i18n } = useTranslation();

	const locale = (i18n.resolvedLanguage || LocalEnum.en_US) as Locale;
	const language = LANGUAGE_MAP[locale];

	const setLocale = (locale: Locale) => {
		i18n.changeLanguage(locale);
		document.documentElement.lang = locale;
		dayjs.locale(locale);
	};

	return {
		t,
		locale,
		language,
		setLocale,
	};
}
