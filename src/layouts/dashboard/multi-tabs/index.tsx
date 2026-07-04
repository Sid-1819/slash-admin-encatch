import { useRouter } from "@/routes/hooks";
import { useEffect, useRef } from "react";
import SortableContainer from "./components/sortable-container";
import { SortableItem } from "./components/sortable-item";
import { TabItem } from "./components/tab-item";
import { useMultiTabsStyle } from "./hooks/use-tab-style";
import { useMultiTabsContext } from "./providers/multi-tabs-provider";
import type { KeepAliveTab } from "./types";

export default function MultiTabs() {
	const scrollContainer = useRef<HTMLUListElement>(null);

	const { tabs, activeTabRoutePath, setTabs } = useMultiTabsContext();
	const style = useMultiTabsStyle();
	const { push } = useRouter();

	const handleTabClick = ({ key }: KeepAliveTab) => {
		push(key);
	};

	useEffect(() => {
		if (!scrollContainer.current) return;
		const tab = tabs.find((item) => item.key === activeTabRoutePath);
		const currentTabElement = scrollContainer.current.querySelector(`#tab${tab?.key.split("/").join("-")}`);
		if (currentTabElement) {
			currentTabElement.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
	}, [tabs, activeTabRoutePath]);

	useEffect(() => {
		const container = scrollContainer.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			container.scrollLeft += e.deltaY;
		};

		container.addEventListener("mouseenter", () => {
			container.addEventListener("wheel", handleWheel);
		});

		container.addEventListener("mouseleave", () => {
			container.removeEventListener("wheel", handleWheel);
		});

		return () => {
			container.removeEventListener("wheel", handleWheel);
		};
	}, []);

	const handleDragEnd = (oldIndex: number, newIndex: number) => {
		const newTabs = Array.from(tabs);
		const [movedTab] = newTabs.splice(oldIndex, 1);
		newTabs.splice(newIndex, 0, movedTab);
		setTabs([...newTabs]);
	};

	const renderOverlay = (id: string | number) => {
		const tab = tabs.find((tab) => tab.key === id);
		if (!tab) return null;
		return <TabItem tab={tab} />;
	};

	const activeTab = tabs.find((tab) => tab.key === activeTabRoutePath);

	return (
		<div className="h-full mt-0.5">
			<div style={style}>
				<SortableContainer items={tabs} onSortEnd={handleDragEnd} renderOverlay={renderOverlay}>
					<ul ref={scrollContainer} className="flex overflow-x-auto w-full px-2 h-[32px] hide-scrollbar">
						{tabs.map((tab) => (
							<SortableItem tab={tab} key={tab.key} onClick={() => handleTabClick(tab)} />
						))}
					</ul>
				</SortableContainer>
			</div>
			<div className="h-[calc(100%-32px)]">{activeTab && <div key={activeTab.timeStamp}>{activeTab.children}</div>}</div>
		</div>
	);
}
