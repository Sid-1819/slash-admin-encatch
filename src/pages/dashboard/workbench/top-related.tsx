import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { ScrollArea } from "@/ui/scroll-area";

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
	const stars = Array.from({ length: max }, (_, i) => ({ id: `star-pos-${i}`, filled: value - i }));
	return (
		<div className="flex gap-0.5">
			{stars.map((star) => (
				<svg
					key={star.id}
					width={14}
					height={14}
					viewBox="0 0 24 24"
					fill={star.filled >= 1 ? "#fadb14" : star.filled >= 0.5 ? "url(#half)" : "none"}
					stroke="#fadb14"
					strokeWidth={1.5}
					aria-hidden="true"
				>
					{star.filled > 0 && star.filled < 1 && (
						<defs>
							<linearGradient id="half">
								<stop offset="50%" stopColor="#fadb14" />
								<stop offset="50%" stopColor="transparent" />
							</linearGradient>
						</defs>
					)}
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
				</svg>
			))}
		</div>
	);
}
const dataSource = [
	{
		logo: <Icon icon="logos:chrome" size={24} />,
		title: "Chrome",
		platform: "Mac",
		type: "free",
		star: 4,
		reviews: "9.91k",
	},
	{
		logo: <Icon icon="logos:google-drive" size={24} />,
		title: "Drive",
		platform: "Mac",
		type: "free",
		star: 3.5,
		reviews: "1.95k",
	},
	{
		logo: <Icon icon="logos:dropbox" size={24} />,
		title: "Dropbox",
		platform: "Windows",
		type: "$66.71",
		star: 4.5,
		reviews: "9.12k",
	},
	{
		logo: <Icon icon="logos:slack-icon" size={24} />,
		title: "Slack",
		platform: "Mac",
		type: "free",
		star: 3.5,
		reviews: "6.98k",
	},
	{
		logo: <Icon icon="logos:discord-icon" size={24} />,
		title: "Discord",
		platform: "Windows",
		type: "$52.17",
		star: 0.5,
		reviews: "8.49k",
	},
];
export default function TopRelated() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Top Related Applications</CardTitle>
			</CardHeader>
			<CardContent>
				<ScrollArea>
					{dataSource.map((item) => (
						<div className="mb-4 flex" key={item.title}>
							<div
								className="mr-2 flex items-center justify-center"
								style={{
									background: `rgba(${themeVars.colors.background.defaultChannel}/ .4)`,
									borderRadius: "12px",
									width: "48px",
									height: "48px",
								}}
							>
								{item.logo}
							</div>

							<div className="flex flex-col">
								<span className="font-medium">{item.title}</span>
								<div className="flex items-center justify-center text-gray gap-2">
									{item.platform === "Mac" ? <Icon icon="wpf:mac-os" size={12} /> : <Icon icon="mingcute:windows-fill" size={12} />}
									<span className="text-xs font-light">{item.platform}</span>
									<Badge variant={item.type === "free" ? "success" : "error"}>{item.type}</Badge>
								</div>
							</div>

							<div className="ml-auto flex flex-col self-center">
								<StarRating value={item.star} />
								<span className="mt-1 text-right text-xs text-gray-400">{item.reviews}reviews</span>
							</div>
						</div>
					))}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
