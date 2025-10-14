import Logo from "@/assets/images/logo.png";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { MotionLazy } from "./components/animate/motion-lazy";
import { RouteLoadingProgress } from "./components/loading";
import Toast from "./components/toast";
import { GLOBAL_CONFIG } from "./global-config";
import { useScrollTracking } from "./hooks";
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
	// Enable scroll tracking across the entire app
	useScrollTracking({
		thresholds: [25, 50, 75, 100],
		throttleMs: 300,
	});

	// Initialize Encatch feedback features
	useEffect(() => {
		const initializeFeedback = async () => {
			// Wait for encatch to be fully loaded
			if (window.encatch) {
				// Verify feedback IDs (replace with your actual feedback configuration IDs)
				if (typeof window.encatch.verifyFeedbackIds === "function") {
					const feedbackIds = ["feedback-config-id-1", "dashboard-feedback", "profile-feedback"];
					const validIds = window.encatch.verifyFeedbackIds(feedbackIds);
					console.log("Valid feedback IDs:", validIds);
				}

				// Force fetch eligible feedbacks to ensure the latest feedback configurations
				if (typeof window.encatch.forceFetchEligibleFeedbacks === "function") {
					try {
						await window.encatch.forceFetchEligibleFeedbacks();
						console.log("Successfully fetched eligible feedbacks");
					} catch (error) {
						console.error("Error fetching eligible feedbacks:", error);
					}
				}
			}
		};

		// Delay initialization to ensure SDK is loaded
		const timer = setTimeout(initializeFeedback, 1000);
		return () => clearTimeout(timer);
	}, []);

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
					<RouteLoadingProgress />
					<MotionLazy>{children}</MotionLazy>
				</ThemeProvider>
			</QueryClientProvider>
		</HelmetProvider>
	);
}

export default App;
