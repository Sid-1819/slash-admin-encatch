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
	interface EnsightGlobal {
		_i: any[]; // Queue for storing function calls
		apiKey: string;
		chunkUrlLoader(url: string): string;
		config: EnsightConfig;
		init(apiKey: string, options?: EnsightConfig): void;
		trackEvent: (...args: any[]) => void;
		setIdentity: (...args: any[]) => void;
		verifyFeedbackIds: (...args: any[]) => void;
		forcedFetchConfiguration: () => Promise<void>;
		captureScrollFeedback: (scrollPercent: number | string) => void;
		[key: string]: any; // 👈 Add an index signature to fix dynamic property access
	}

	interface Window {
		enspectPlugin: {
			mount: () => void;
			unmount: () => void;
		};
		ensightPlugin: {
			mount: () => void;
			unmount: () => void;
		};
	}

	interface Window {
		enspect: EnspectGlobal;
		ensight: EnsightGlobal;
	}
}
