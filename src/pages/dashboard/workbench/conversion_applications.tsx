import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";

export function Conversion() {
	return (
		<Basic
			percent={48}
			title="38,566"
			subtitle="Conversion"
			iconify="tabler:user-filled"
			bg={themeVars.colors.palette.primary.default}
			strokeColor={themeVars.colors.palette.primary.light}
		/>
	);
}
export function Applications() {
	return (
		<Basic
			percent={75}
			title="45,566"
			subtitle="Applications"
			iconify="ic:round-email"
			bg={themeVars.colors.palette.info.default}
			strokeColor={themeVars.colors.palette.info.light}
		/>
	);
}

type Props = {
	percent: number;
	title: string;
	subtitle: string;
	iconify: string;
	bg?: string;
	strokeColor?: string;
};

function CircularProgress({ percent, size = 70, strokeColor, textColor }: { percent: number; size?: number; strokeColor?: string; textColor?: string }) {
	const strokeWidth = 6;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (percent / 100) * circumference;

	return (
		<div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
			<svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${percent}% progress`}>
				<title>{`${percent}% progress`}</title>
				<circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeWidth} />
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke={strokeColor || "currentColor"}
					strokeWidth={strokeWidth}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					className="transition-all duration-300"
				/>
			</svg>
			<span className="absolute text-sm font-semibold" style={{ color: textColor }}>
				{percent}%
			</span>
		</div>
	);
}

function Basic({ percent, title, subtitle, iconify, bg, strokeColor }: Props) {
	return (
		<div className="relative flex items-center rounded-2xl p-6" style={{ background: bg, color: themeVars.colors.background.default }}>
			<CircularProgress percent={percent} strokeColor={strokeColor} textColor={themeVars.colors.background.default} />
			<div className="ml-2 flex flex-col">
				<span className="text-2xl font-bold">{title}</span>
				<span className="opacity-50">{subtitle}</span>
			</div>
			<div className="absolute right-0">
				<Icon icon={iconify} style={{ opacity: 0.08 }} size={100} />
			</div>
		</div>
	);
}
