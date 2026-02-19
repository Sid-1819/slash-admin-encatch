import { useEffect } from "react";
import { initEncatch } from "@/lib/encatch";

/**
 * Initializes the Encatch Web SDK and attaches the window.encatch adapter
 * so existing code (trackEvent, identify, openFeedbackById, etc.) keeps working.
 * Renders nothing.
 */
export function EncatchProvider() {
	useEffect(() => {
		initEncatch();
	}, []);
	return null;
}
