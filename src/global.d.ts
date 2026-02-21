export {};

declare global {
	interface EnspectGlobal {
		_i: any[]; // Queue for storing function calls
		apiKey: string;
		chunkUrlLoader(url: string): string;
		config: EnspectConfig;
		init(apiKey: string, options?: EnspectConfig): void;
		trackEvent?: (...args: any[]) => void;
		resetSession?: (...args: any[]) => void;
		reset?: (...args: any[]) => void;
		[key: string]: any; // 👈 Add an index signature to fix dynamic property access
	}
	interface Window {
		encatchPlugin?: {
			mount: () => void;
			unmount: () => void;
		};
	}
}
