import "./global.css";
import "./theme/theme.css";
import "./locales/i18n";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, RouterProvider, createBrowserRouter } from "react-router";
import App from "./App";
import { worker } from "./_mock";
import menuService from "./api/services/menuService";
import { registerLocalIcons } from "./components/icon";
import { GLOBAL_CONFIG } from "./global-config";
import PageError from "./pages/sys/error/PageError";
import { routesSection } from "./routes/sections";
import { urlJoin } from "./utils";
// import { init } from "encatch-web-sdk";

await registerLocalIcons();
await worker.start({
	onUnhandledRequest: "bypass",
	serviceWorker: {
		url: urlJoin(GLOBAL_CONFIG.publicPath, "mockServiceWorker.js"),
	},
});
if (GLOBAL_CONFIG.routerMode === "backend") {
	await menuService.getMenuList();
}

// init("eng_dev_11eu7yMd66L64yGvaf0KYMKeTgBuYBJ8jVWrjsCruWuwW89bthYLQkdro8YrNlv0boi8NC1gltv3_70f15c73", {
// 	host: "https://app.dev.encatch.com",
// });

const router = createBrowserRouter(
	[
		{
			Component: () => (
				<App>
					<Outlet />
				</App>
			),
			errorElement: <ErrorBoundary fallbackRender={PageError} />,
			children: routesSection,
		},
	],
	{
		basename: GLOBAL_CONFIG.publicPath,
	},
);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<RouterProvider router={router} />);
