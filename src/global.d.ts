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
	interface EncatchGlobal {
		_i: QueueItem[]; // Queue for storing function calls
		apiKey: string;
		chunkUrlLoader(url: string): string;
		config: EncatchConfig;
		init(apiKey: string, options?: EncatchConfig): void;
		trackEvent: (eventName: string, properties?: Record<string, any>) => void;
		identify?: (
			userId: string,
			traits?: {
				$set?: Record<string, any>;
				$set_once?: Record<string, any>;
				$counter?: Record<string, any>;
				$unset?: string[];
				[key: string]: any;
			},
		) => void;
		// stopSession?: () => void;
		// startSession?: () => void;
		// resetSession?: () => void;
		setThemeMode?: (theme: "light" | "dark") => void;
		setLanguage?: (language: string) => void;
		openFeedbackById?: (feedbackConfigurationId: string, theme?: "light" | "dark", language?: string, event?: string) => void;
		openFeedbackByName?: (feedbackConfigurationName: string, theme?: "light" | "dark", language?: string, event?: string) => void;
		verifyFeedbackIds?: (feedbackConfigurationIds: string[]) => string[];
		forceFetchEligibleFeedbacks?: () => Promise<void>;
		capturePageScrollEvent: (scrollPercent: string) => void;
		_internal: {
			submitFeedback: (params: {
				data: Response;
				action: "S" | "V";
				feedbackConfigurationId: string;
				feedbackIdentifier?: string;
				duration: number;
			}) => Promise<SubmitFeedbackResponse>;
			refineText: (params: {
				questionId: string;
				identifier: string;
				feedbackConfigurationId: string;
				userText: string;
			}) => Promise<{
				code: string;
				message: string;
				messageId: string;
				data: {
					userText: string;
					refinedText: string;
				};
			} | null>;
			closeFeedbackModal: () => void;
		};
		[key: string]: any; // Index signature for dynamic property access
	}

	interface Window {
		encatch: EncatchGlobal;
		encatchPlugin: {
			mount: () => void;
			unmount: () => void;
		};
	}
}
