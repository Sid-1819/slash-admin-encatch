import { useEffect, useRef } from "react";

interface ScrollTrackingOptions {
	thresholds?: number[]; // Percentage thresholds to track (e.g., [25, 50, 75, 100])
	throttleMs?: number; // Throttle scroll event processing
}

/**
 * Custom hook to track page scroll events using Encatch SDK
 * @param options Configuration options for scroll tracking
 */
export function useScrollTracking(options: ScrollTrackingOptions = {}) {
	const { thresholds = [25, 50, 75, 100], throttleMs = 300 } = options;
	const trackedThresholds = useRef(new Set<number>());
	const lastScrollTime = useRef(0);

	useEffect(() => {
		const handleScroll = () => {
			const now = Date.now();
			if (now - lastScrollTime.current < throttleMs) {
				return;
			}
			lastScrollTime.current = now;

			const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
			const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

			// Track each threshold only once
			for (const threshold of thresholds) {
				if (scrollPercent >= threshold && !trackedThresholds.current.has(threshold)) {
					trackedThresholds.current.add(threshold);

					// Call Encatch SDK method
					if (window.encatch && typeof window.encatch.capturePageScrollEvent === "function") {
						window.encatch.capturePageScrollEvent(`${threshold}%`);
					}

					// Also track as a regular event for analytics
					if (window.encatch && typeof window.encatch.trackEvent === "function") {
						window.encatch.trackEvent("page_scroll", {
							scrollPercent: threshold,
							page: window.location.pathname,
						});
					}
				}
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", handleScroll);
			// Reset tracked thresholds on unmount
			trackedThresholds.current.clear();
		};
	}, [thresholds, throttleMs]);
}
