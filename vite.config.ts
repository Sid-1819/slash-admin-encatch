import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const ENCATCH_PROXY_DEFAULT = "https://app.uat.encatch.com";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const base = env.VITE_APP_PUBLIC_PATH || "/";
	const isProduction = mode === "production";
	/** Encatch proxy target. Set ENCATCH_PROXY_TARGET in .env to match the host configured on the login panel. */
	const encatchTarget = env.ENCATCH_PROXY_TARGET || ENCATCH_PROXY_DEFAULT;

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
				// Encatch – proxy target from ENCATCH_PROXY_TARGET (.env), default app.dev.encatch.com. Match the host set on the login panel.
				// 1) API: so track-event etc. go through proxy (avoids CORS on x-device-id)
				"/engage-product/encatch/api": {
					target: encatchTarget,
					changeOrigin: true,
					secure: true,
				},
				// 2) Form/iframe: so iframe URL stays on origin and gets proxied (avoids 404)
				"/engage-product/encatch": {
					target: encatchTarget,
					changeOrigin: true,
					secure: true,
				},
				// 3) SDK script: so script loads from origin (avoids CORS on encatch.js) – must be before /s
				// "/s/sdk/v1": { target: encatchTarget, changeOrigin: true, secure: true },
				// 4) Form iframe: SDK loads form at /s/web-sdk-form?formId=...
				"/s/": {
					target: encatchTarget,
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
