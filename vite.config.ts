import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const ENCATCH_PROXY_API_DEFAULT = "https://api.dev.encatch.com";
const ENCATCH_PROXY_WEB_DEFAULT = "https://form.dev.encatch.com";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const base = env.VITE_APP_PUBLIC_PATH || "/";
	const isProduction = mode === "production";
	/** Encatch API proxy target (api.dev / api.uat / api.encatch). */
	const encatchApiTarget = env.ENCATCH_PROXY_API_TARGET || ENCATCH_PROXY_API_DEFAULT;
	/** Encatch form/iframe proxy target (form.dev / form-uat / form.encatch). */
	const encatchWebTarget = env.ENCATCH_PROXY_WEB_TARGET || ENCATCH_PROXY_WEB_DEFAULT;

	return {
		base,
		plugins: [
			react(),
			vanillaExtractPlugin({
				identifiers: ({ debugId }) => `${debugId}`,
			}),
			tailwindcss(),
			tsconfigPaths(),

			isProduction &&
				visualizer({
					open: true,
					gzipSize: true,
					brotliSize: true,
					template: "treemap",
				}),
		].filter(Boolean),

		server: {
			open: true,
			host: true,
			port: 3001,
			proxy: {
				"/api": {
					target: "http://localhost:3000",
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ""),
					secure: false,
				},
				// Encatch – split API vs form hosts (api.dev.encatch.com / form.dev.encatch.com).
				// Set ENCATCH_PROXY_API_TARGET and ENCATCH_PROXY_WEB_TARGET in .env to match Encatch Test config.
				// 1) API: track-event, ping, show-form, etc.
				"/engage-product/encatch/api": {
					target: encatchApiTarget,
					changeOrigin: true,
					secure: true,
				},
				// 2) Form/iframe assets (non-API engage-product paths)
				"/engage-product/encatch": {
					target: encatchWebTarget,
					changeOrigin: true,
					secure: true,
				},
				// 3) Form iframe: SDK loads form at /s/web-sdk-form?formId=...
				"/s/": {
					target: encatchWebTarget,
					changeOrigin: true,
					secure: true,
				},
			},
		},

		build: {
			target: "esnext",
			minify: "esbuild",
			sourcemap: !isProduction,
			cssCodeSplit: true,
			chunkSizeWarningLimit: 1500,
			rollupOptions: {
				output: {
					manualChunks: {
						"vendor-core": ["react", "react-dom", "react-router"],
						"vendor-ui": ["antd", "@ant-design/cssinjs", "styled-components"],
						"vendor-utils": ["axios", "dayjs", "i18next", "zustand", "@iconify/react"],
						"vendor-charts": ["apexcharts", "react-apexcharts"],
					},
				},
			},
		},

		optimizeDeps: {
			include: ["react", "react-dom", "react-router", "antd", "axios", "dayjs"],
			exclude: ["@iconify/react"],
		},

		esbuild: {
			drop: isProduction ? ["console", "debugger"] : [],
			legalComments: "none",
			target: "esnext",
		},
	};
});
