import Logo from "@/assets/images/logo.png";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import _refiner from "refiner-js";
import { MotionLazy } from "./components/animate/motion-lazy";
import { EncatchProvider } from "./components/encatch-provider";
import { RouteLoadingProgress } from "./components/loading";
import Toast from "./components/toast";
import { GLOBAL_CONFIG } from "./global-config";
import { useScrollTracking } from "./hooks";
import { useUserInfo } from "./store/userStore";
import { AntdAdapter } from "./theme/adapter/antd.adapter";
import { ThemeProvider } from "./theme/theme-provider";

if (import.meta.env.DEV) {
	import("react-scan").then(({ scan }) => {
		scan({
			enabled: false,
			showToolbar: true,
			log: false,
			animationSpeed: "fast",
		});
	});
}

function App({ children }: { children: React.ReactNode }) {
	const userInfo = useUserInfo();

	// Enable scroll tracking across the entire app
	useScrollTracking({
		thresholds: [25, 50, 75, 100],
		throttleMs: 300,
	});

	// Initialize Refiner
	useEffect(() => {
		_refiner("setProject", "88f6d7f0-8a16-11f0-bbfa-052e1a97567e");
	}, []);

	// Identify user with Refiner if already logged in
	useEffect(() => {
		if (userInfo?.username && userInfo.username !== "guest") {
			_refiner("identifyUser", {
				id: userInfo.id || userInfo.username,
				email: userInfo.email,
				name: userInfo.username,
			});
		}
	}, [userInfo]);

	return (
		<HelmetProvider>
			<QueryClientProvider client={new QueryClient()}>
				<ThemeProvider adapters={[AntdAdapter]}>
					<VercelAnalytics debug={import.meta.env.PROD} />
					<Helmet>
						<title>{GLOBAL_CONFIG.appName}</title>
						<link rel="icon" href={Logo} />
					</Helmet>
					<Toast />
					<EncatchProvider />
					<RouteLoadingProgress />
					<MotionLazy>{children}</MotionLazy>
				</ThemeProvider>
			</QueryClientProvider>
		</HelmetProvider>
	);
}

export default App;
