import { useEffect } from "react";
import { initEncatch } from "@/lib/encatch";

/**
 * Initializes the Encatch Web SDK (_encatch). Call _encatch methods (trackEvent, identifyUser, showForm, etc.) from @/lib/encatch. Renders nothing.
 */
export function EncatchProvider() {
	useEffect(() => {
		initEncatch();
	}, []);
	return null;
}
