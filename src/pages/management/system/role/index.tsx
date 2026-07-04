import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { useState } from "react";
import type { Role_Old } from "#/entity";
import { BasicStatus } from "#/enum";
import { RoleModal, type RoleModalProps } from "./role-modal";

const ROLES: Role_Old[] = [];

const DEFAULE_ROLE_VALUE: Role_Old = {
	id: "",
	name: "",
	code: "",
	status: BasicStatus.ENABLE,
	permission: [],
};
export default function RolePage() {
	const [roleModalPros, setRoleModalProps] = useState<RoleModalProps>({
		formValue: { ...DEFAULE_ROLE_VALUE },
		title: "New",
		show: false,
		onOk: () => {
			setRoleModalProps((prev) => ({ ...prev, show: false }));
		},
		onCancel: () => {
			setRoleModalProps((prev) => ({ ...prev, show: false }));
		},
	});

	const onCreate = () => {
		setRoleModalProps((prev) => ({
			...prev,
			show: true,
			title: "Create New",
			formValue: {
				...prev.formValue,
				...DEFAULE_ROLE_VALUE,
			},
		}));
	};

	const onEdit = (formValue: Role_Old) => {
		setRoleModalProps((prev) => ({
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
					<div>Role List</div>
					<Button onClick={onCreate}>New</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[300px]">Name</TableHead>
							<TableHead>Label</TableHead>
							<TableHead className="w-[60px]">Order</TableHead>
							<TableHead className="text-center w-[120px]">Status</TableHead>
							<TableHead>Desc</TableHead>
							<TableHead className="text-center w-[100px]">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{ROLES.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
									No roles found.
								</TableCell>
							</TableRow>
						) : (
							ROLES.map((record) => (
								<TableRow key={record.id}>
									<TableCell>{record.name}</TableCell>
									<TableCell>{record.code}</TableCell>
									<TableCell>{record.order}</TableCell>
									<TableCell className="text-center">
										<Badge variant={record.status === BasicStatus.DISABLE ? "error" : "success"}>
											{record.status === BasicStatus.DISABLE ? "Disable" : "Enable"}
										</Badge>
									</TableCell>
									<TableCell>{record.desc}</TableCell>
									<TableCell>
										<div className="flex w-full justify-center text-muted-foreground">
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
			<RoleModal {...roleModalPros} />
		</Card>
	);
}
