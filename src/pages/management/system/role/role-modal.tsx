import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PERMISSION_LIST } from "@/_mock/assets";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { ScrollArea } from "@/ui/scroll-area";
import { Textarea } from "@/ui/textarea";
import { flattenTrees } from "@/utils/tree";

import type { Permission_Old, Role_Old } from "#/entity";
import { BasicStatus } from "#/enum";

export type RoleModalProps = {
	formValue: Role_Old;
	title: string;
	show: boolean;
	onOk: VoidFunction;
	onCancel: VoidFunction;
};
const PERMISSIONS: Permission_Old[] = PERMISSION_LIST as Permission_Old[];

function TreeNode({ node, checkedKeys, onToggle, level = 0 }: { node: any; checkedKeys: string[]; onToggle: (id: string) => void; level?: number }) {
	const isChecked = checkedKeys.includes(node.id);
	const children = node.children || [];

	return (
		<div style={{ paddingLeft: `${level * 20}px` }}>
			<div className="flex items-center gap-2 py-1">
				<Checkbox checked={isChecked} onCheckedChange={() => onToggle(node.id)} id={`perm-${node.id}`} />
				<Label htmlFor={`perm-${node.id}`} className="text-sm font-normal cursor-pointer">
					{node.name}
				</Label>
			</div>
			{children.map((child: any) => (
				<TreeNode key={child.id} node={child} checkedKeys={checkedKeys} onToggle={onToggle} level={level + 1} />
			))}
		</div>
	);
}

export function RoleModal({ title, show, formValue, onOk, onCancel }: RoleModalProps) {
	const form = useForm<Role_Old>({
		defaultValues: formValue,
	});

	const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

	useEffect(() => {
		const flattenedPermissions = flattenTrees(formValue.permission);
		setCheckedKeys(flattenedPermissions.map((item) => item.id));
	}, [formValue]);

	useEffect(() => {
		form.reset(formValue);
	}, [formValue, form]);

	const onToggle = (id: string) => {
		setCheckedKeys((prev) => {
			const next = prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id];
			form.setValue(
				"permission",
				PERMISSIONS.filter((item) => next.includes(item.id)),
			);
			return next;
		});
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<div className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="grid grid-cols-4 items-center gap-4">
									<FormLabel className="text-right">Name</FormLabel>
									<div className="col-span-3">
										<FormControl>
											<Input {...field} />
										</FormControl>
									</div>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem className="grid grid-cols-4 items-center gap-4">
									<FormLabel className="text-right">Label</FormLabel>
									<div className="col-span-3">
										<FormControl>
											<Input {...field} />
										</FormControl>
									</div>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="order"
							render={({ field }) => (
								<FormItem className="grid grid-cols-4 items-center gap-4">
									<FormLabel className="text-right">Order</FormLabel>
									<div className="col-span-3">
										<FormControl>
											<Input type="number" {...field} />
										</FormControl>
									</div>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="grid grid-cols-4 items-center gap-4">
									<FormLabel className="text-right">Status</FormLabel>
									<div className="col-span-3">
										<FormControl>
											<RadioGroup onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
												<div className="flex items-center space-x-2">
													<RadioGroupItem value={String(BasicStatus.ENABLE)} id="r1" />
													<Label htmlFor="r1">Enable</Label>
												</div>
												<div className="flex items-center space-x-2">
													<RadioGroupItem value={String(BasicStatus.DISABLE)} id="r2" />
													<Label htmlFor="r2">Disable</Label>
												</div>
											</RadioGroup>
										</FormControl>
									</div>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="desc"
							render={({ field }) => (
								<FormItem className="grid grid-cols-4 items-center gap-4">
									<FormLabel className="text-right">Desc</FormLabel>
									<div className="col-span-3">
										<FormControl>
											<Textarea {...field} />
										</FormControl>
									</div>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="permission"
							render={() => (
								<FormItem className="grid grid-cols-4 items-start gap-4">
									<FormLabel className="text-right pt-2">Permission</FormLabel>
									<div className="col-span-3">
										<FormControl>
											<ScrollArea className="h-[200px] rounded-md border p-2">
												{PERMISSIONS.map((perm) => (
													<TreeNode key={perm.id} node={perm} checkedKeys={checkedKeys} onToggle={onToggle} />
												))}
											</ScrollArea>
										</FormControl>
									</div>
								</FormItem>
							)}
						/>
					</div>
				</Form>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							form.handleSubmit(onOk)();
						}}
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
