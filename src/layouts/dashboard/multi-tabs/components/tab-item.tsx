import { Icon } from "@/components/icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { MultiTabOperation } from "#/enum";
import { useTabLabelRender } from "../hooks/use-tab-label-render";
import { useMultiTabsContext } from "../providers/multi-tabs-provider";
import type { TabItemProps } from "../types";

export function TabItem({ tab, style, onClose }: TabItemProps) {
	const { t } = useTranslation();
	const { tabs, refreshTab, closeTab, closeOthersTab, closeLeft, closeRight, closeAll } = useMultiTabsContext();
	const renderTabLabel = useTabLabelRender();

	const menuClick = (key: string) => {
		switch (key) {
			case MultiTabOperation.REFRESH:
				refreshTab(tab.key);
				break;
			case MultiTabOperation.CLOSE:
				closeTab(tab.key);
				break;
			case MultiTabOperation.CLOSEOTHERS:
				closeOthersTab(tab.key);
				break;
			case MultiTabOperation.CLOSELEFT:
				closeLeft(tab.key);
				break;
			case MultiTabOperation.CLOSERIGHT:
				closeRight(tab.key);
				break;
			case MultiTabOperation.CLOSEALL:
				closeAll();
				break;
			default:
				break;
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<div className="relative flex select-none items-center px-4 py-1 cursor-pointer" style={style}>
					<div>{renderTabLabel(tab)}</div>
					{!tab.hideTab && (
						<Icon
							icon="ion:close-outline"
							size={18}
							className="ml-2 cursor-pointer opacity-50"
							onClick={(e) => {
								e.stopPropagation();
								onClose?.();
							}}
						/>
					)}
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={() => menuClick(MultiTabOperation.REFRESH)}>
					<Icon icon="mdi:reload" size={18} className="mr-2" />
					{t(`sys.tab.${MultiTabOperation.REFRESH}`)}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => menuClick(MultiTabOperation.CLOSE)} disabled={tabs.length === 1}>
					<Icon icon="material-symbols:close" size={18} className="mr-2" />
					{t(`sys.tab.${MultiTabOperation.CLOSE}`)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => menuClick(MultiTabOperation.CLOSELEFT)} disabled={tabs.findIndex((t) => t.key === tab.key) === 0}>
					<Icon icon="material-symbols:tab-close-right-outline" size={18} className="mr-2 rotate-180" />
					{t(`sys.tab.${MultiTabOperation.CLOSELEFT}`)}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => menuClick(MultiTabOperation.CLOSERIGHT)} disabled={tabs.findIndex((t) => t.key === tab.key) === tabs.length - 1}>
					<Icon icon="material-symbols:tab-close-right-outline" size={18} className="mr-2" />
					{t(`sys.tab.${MultiTabOperation.CLOSERIGHT}`)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => menuClick(MultiTabOperation.CLOSEOTHERS)} disabled={tabs.length === 1}>
					<Icon icon="material-symbols:tab-close-outline" size={18} className="mr-2" />
					{t(`sys.tab.${MultiTabOperation.CLOSEOTHERS}`)}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => menuClick(MultiTabOperation.CLOSEALL)}>
					<Icon icon="mdi:collapse-all-outline" size={18} className="mr-2" />
					{t(`sys.tab.${MultiTabOperation.CLOSEALL}`)}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
