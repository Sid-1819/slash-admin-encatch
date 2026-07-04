import { Button } from "@/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/ui/toggle-group";
import { cn } from "@/utils";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Permission_Old } from "#/entity";
import { BasicStatus, PermissionType } from "#/enum";

const ENTRY_PATH = "/src/pages";
const PAGES = import.meta.glob("/src/pages/**/*.tsx");
const PAGE_SELECT_OPTIONS = Object.entries(PAGES).map(([path]) => {
	const pagePath = path.replace(ENTRY_PATH, "");
	return {
		label: pagePath,
		value: pagePath,
	};
});

export type PermissionModalProps = {
	formValue: Permission_Old;
	title: string;
	show: boolean;
	onOk: (values: Permission_Old) => void;
	onCancel: VoidFunction;
};

function flattenPermissions(permissions: any[], parentLabel = ""): { id: string; name: string; depth: number }[] {
	const result: { id: string; name: string; depth: number }[] = [];
	for (const perm of permissions) {
		result.push({ id: perm.id, name: perm.name, depth: parentLabel ? 1 : 0 });
		if (perm.children) {
			result.push(...flattenPermissions(perm.children, perm.name));
		}
	}
	return result;
}

export default function PermissionModal({ title, show, formValue, onOk, onCancel }: PermissionModalProps) {
	const form = useForm<Permission_Old>({
		defaultValues: formValue,
	});

	const permissions: any[] = [];
	const [compOptions, setCompOptions] = useState(PAGE_SELECT_OPTIONS);
	const [compOpen, setCompOpen] = useState(false);

	const flatPermissions = flattenPermissions(permissions);

	const getParentNameById = useCallback((parentId: string, data: Permission_Old[] | undefined = permissions) => {
		let name = "";
		if (!data || !parentId) return name;
		for (let i = 0; i < data.length; i += 1) {
			if (data[i].id === parentId) {
				name = data[i].name;
			} else if (data[i].children) {
				name = getParentNameById(parentId, data[i].children);
			}
			if (name) break;
		}
		return name;
	}, []);

	const updateCompOptions = useCallback((name: string) => {
		if (!name) return;
		setCompOptions(PAGE_SELECT_OPTIONS.filter((path) => path.value.includes(name.toLowerCase())));
	}, []);

	useEffect(() => {
		form.reset(formValue);
		if (formValue.parentId) {
			const parentName = getParentNameById(formValue.parentId);
			updateCompOptions(parentName);
		}
	}, [formValue, form, getParentNameById, updateCompOptions]);

	const onSubmit = (values: Permission_Old) => {
		onOk(values);
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Type</FormLabel>
									<FormControl>
										<ToggleGroup
											type="single"
											variant="outline"
											className="w-auto"
											value={String(field.value)}
											onValueChange={(value) => field.onChange(value)}
										>
											<ToggleGroupItem value={String(PermissionType.CATALOGUE)}>CATALOGUE</ToggleGroupItem>
											<ToggleGroupItem value={String(PermissionType.MENU)}>MENU</ToggleGroupItem>
										</ToggleGroup>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="label"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Label</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="parentId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Parent</FormLabel>
									<FormControl>
										<Select
											value={field.value || ""}
											onValueChange={(value) => {
												field.onChange(value);
												const perm = flatPermissions.find((p) => p.id === value);
												if (perm?.name) updateCompOptions(perm.name);
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select parent" />
											</SelectTrigger>
											<SelectContent>
												{flatPermissions.map((perm) => (
													<SelectItem key={perm.id} value={perm.id}>
														<span style={{ paddingLeft: perm.depth * 12 }}>{perm.name}</span>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="route"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Route</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						{form.watch("type") === PermissionType.MENU && (
							<FormField
								control={form.control}
								name="component"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Component</FormLabel>
										<Popover open={compOpen} onOpenChange={setCompOpen}>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														aria-haspopup="listbox"
														className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
													>
														{field.value || "Select component"}
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-full p-0" align="start">
												<Command>
													<CommandInput placeholder="Search component..." />
													<CommandList>
														<CommandEmpty>No component found.</CommandEmpty>
														<CommandGroup>
															{compOptions.map((option) => (
																<CommandItem
																	key={option.value}
																	value={option.value}
																	onSelect={(value) => {
																		field.onChange(value);
																		setCompOpen(false);
																	}}
																>
																	{option.label}
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="icon"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Icon</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="hide"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Hide</FormLabel>
									<FormControl>
										<ToggleGroup type="single" variant="outline" value={String(!!field.value)} onValueChange={(value) => field.onChange(Boolean(value))}>
											<ToggleGroupItem value="false">Show</ToggleGroupItem>
											<ToggleGroupItem value="true">Hide</ToggleGroupItem>
										</ToggleGroup>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="order"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Order</FormLabel>
									<FormControl>
										<Input type="number" {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status</FormLabel>
									<FormControl>
										<ToggleGroup type="single" variant="outline" value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
											<ToggleGroupItem value={String(BasicStatus.ENABLE)}>Enable</ToggleGroupItem>
											<ToggleGroupItem value={String(BasicStatus.DISABLE)}>Disable</ToggleGroupItem>
										</ToggleGroup>
									</FormControl>
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button variant="outline" onClick={onCancel}>
								Cancel
							</Button>
							<Button type="submit" variant="default">
								Confirm
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
