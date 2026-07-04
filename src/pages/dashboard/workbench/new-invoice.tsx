import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { ScrollArea, ScrollBar } from "@/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

interface DataType {
	key: string;
	id: string;
	category: string;
	price: string;
	status: string;
}

export default function NewInvoice() {
	const data: DataType[] = [
		{ key: "1", id: "INV-1990", category: "Android", price: "$83.74", status: "Paid" },
		{ key: "2", id: "INV-1991", category: "Mac", price: "$97.14", status: "Out of Date" },
		{ key: "3", id: "INV-1992", category: "Windows", price: "$68.71", status: "Progress" },
		{ key: "4", id: "INV-1993", category: "Android", price: "$85.21", status: "Paid" },
		{ key: "5", id: "INV-1994", category: "Mac", price: "$53.17", status: "Paid" },
	];

	const getStatusVariant = (status: string): "success" | "warning" | "error" => {
		if (status === "Progress") return "warning";
		if (status === "Out of Date") return "error";
		return "success";
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>New Invoice</CardTitle>
			</CardHeader>
			<CardContent>
				<ScrollArea>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>InvoiceId</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((record) => (
								<TableRow key={record.key}>
									<TableCell>{record.id}</TableCell>
									<TableCell>{record.category}</TableCell>
									<TableCell>{record.price}</TableCell>
									<TableCell>
										<Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
									</TableCell>
									<TableCell>
										<Button variant="ghost" size="icon">
											<Icon icon="fontisto:more-v-a" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
