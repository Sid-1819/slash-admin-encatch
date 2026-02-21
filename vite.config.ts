import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const base = env.VITE_APP_PUBLIC_PATH || "/";
	const isProduction = mode === "production";

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
				// Encatch – same pattern as web-sdk-tester next.config.ts (rewrites to app.dev.encatch.com)
				// 1) API: so track-event etc. go through proxy (avoids CORS on x-device-id)
				"/engage-product/encatch/api": {
					target: "https://app.dev.encatch.com",
					changeOrigin: true,
					secure: true,
				},
				// 2) Form/iframe: so iframe URL stays on origin and gets proxied (avoids 404)
				"/engage-product/encatch": {
					target: "https://app.dev.encatch.com",
					changeOrigin: true,
					secure: true,
				},
				// 3) SDK script: so script loads from origin (avoids CORS on encatch.js) – must be before /s
				// "/s/sdk/v1": {
				// 	target: "https://app.dev.encatch.com",
				// 	changeOrigin: true,
				// 	secure: true,
				// },
				// // 4) Form iframe: SDK loads form at /s/web-sdk-form?formId=... – proxy so iframe shows form, not 404
				// "/s/web-sdk-form": {
				// 	target: "https://app.dev.encatch.com",
				// 	changeOrigin: true,
				// 	secure: true,
				// },
				"/s/": {
					target: "https://app.dev.encatch.com",
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
