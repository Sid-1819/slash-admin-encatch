import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { isNil } from "ramda";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Permission_Old } from "#/entity";
import { BasicStatus, PermissionType } from "#/enum";
import PermissionModal, { type PermissionModalProps } from "./permission-modal";

const defaultPermissionValue: Permission_Old = {
	id: "",
	parentId: "",
	name: "",
	label: "",
	route: "",
	component: "",
	icon: "",
	hide: false,
	status: BasicStatus.ENABLE,
	type: PermissionType.CATALOGUE,
};

export default function PermissionPage() {
	const { t } = useTranslation();

	const [permissionModalProps, setPermissionModalProps] = useState<PermissionModalProps>({
		formValue: { ...defaultPermissionValue },
		title: "New",
		show: false,
		onOk: () => {
			setPermissionModalProps((prev) => ({ ...prev, show: false }));
		},
		onCancel: () => {
			setPermissionModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	const permissions: Permission_Old[] = [];

	const onCreate = (parentId?: string) => {
		setPermissionModalProps((prev) => ({
			...prev,
			show: true,
			title: "New",
			formValue: { ...defaultPermissionValue, parentId: parentId ?? "" },
		}));
	};

	const onEdit = (formValue: Permission_Old) => {
		setPermissionModalProps((prev) => ({
			...prev,
			show: true,
			title: "Edit",
			formValue,
		}));
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Permission List</div>
					<Button onClick={() => onCreate()}>New</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[300px]">Name</TableHead>
							<TableHead className="w-[60px]">Type</TableHead>
							<TableHead className="w-[60px]">Icon</TableHead>
							<TableHead>Component</TableHead>
							<TableHead className="text-center w-[120px]">Status</TableHead>
							<TableHead className="w-[60px]">Order</TableHead>
							<TableHead className="text-center w-[100px]">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{permissions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
									No permissions found.
								</TableCell>
							</TableRow>
						) : (
							permissions.map((record) => (
								<TableRow key={record.id}>
									<TableCell>{t(record.label)}</TableCell>
									<TableCell>
										<Badge variant="info">{PermissionType[record.type]}</Badge>
									</TableCell>
									<TableCell>{!isNil(record.icon) && <Icon icon={record.icon.startsWith("ic") ? `local:${record.icon}` : record.icon} size={18} />}</TableCell>
									<TableCell>{record.component}</TableCell>
									<TableCell className="text-center">
										<Badge variant={record.status === BasicStatus.DISABLE ? "error" : "success"}>
											{record.status === BasicStatus.DISABLE ? "Disable" : "Enable"}
										</Badge>
									</TableCell>
									<TableCell>{record.order}</TableCell>
									<TableCell>
										<div className="flex w-full justify-end text-muted-foreground">
											{record?.type === PermissionType.CATALOGUE && (
												<Button variant="ghost" size="icon" onClick={() => onCreate(record.id)}>
													<Icon icon="gridicons:add-outline" size={18} />
												</Button>
											)}
											<Button variant="ghost" size="icon" onClick={() => onEdit(record)}>
												<Icon icon="solar:pen-bold-duotone" size={18} />
											</Button>
											<Button variant="ghost" size="icon">
												<Icon icon="mingcute:delete-2-fill" size={18} className="text-destructive" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</CardContent>
			<PermissionModal {...permissionModalProps} />
		</Card>
	);
}
