import { Icon } from "@/components/icon";
import { usePathname, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import type { Role_Old, UserInfo } from "#/entity";
import { BasicStatus } from "#/enum";

const USERS: UserInfo[] = [];

export default function UserPage() {
	const { push } = useRouter();
	const pathname = usePathname();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>User List</div>
					<Button onClick={() => {}}>New</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[300px]">Name</TableHead>
							<TableHead className="text-center w-[120px]">Role</TableHead>
							<TableHead className="text-center w-[120px]">Status</TableHead>
							<TableHead className="text-center w-[100px]">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{USERS.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
									No users found.
								</TableCell>
							</TableRow>
						) : (
							USERS.map((record) => (
								<TableRow key={record.id}>
									<TableCell>
										<div className="flex">
											<img alt="" src={record.avatar} className="h-10 w-10 rounded-full" />
											<div className="ml-2 flex flex-col">
												<span className="text-sm">{record.username}</span>
												<span className="text-xs text-muted-foreground">{record.email}</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="info">{(record.roles as unknown as Role_Old)?.name}</Badge>
									</TableCell>
									<TableCell className="text-center">
										<Badge variant={record.status === BasicStatus.DISABLE ? "error" : "success"}>
											{record.status === BasicStatus.DISABLE ? "Disable" : "Enable"}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex w-full justify-center text-muted-foreground">
											<Button variant="ghost" size="icon" onClick={() => push(`${pathname}/${record.id}`)}>
												<Icon icon="mdi:card-account-details" size={18} />
											</Button>
											<Button variant="ghost" size="icon" onClick={() => {}}>
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
		</Card>
	);
}
