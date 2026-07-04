import { Icon } from "@/components/icon";
import { useCallback, useRef, type ReactElement } from "react";

interface Props {
	placeholder?: ReactElement;
	multiple?: boolean;
	accept?: string;
	onChange?: (files: FileList) => void;
}

export function UploadBox({ placeholder, multiple = false, accept, onChange }: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (e.dataTransfer.files.length > 0) {
				onChange?.(e.dataTransfer.files);
			}
		},
		[onChange],
	);

	return (
		<div
			className="cursor-pointer rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-muted/30"
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => e.preventDefault()}
			onDrop={handleDrop}
		>
			<input
				ref={inputRef}
				type="file"
				multiple={multiple}
				accept={accept}
				className="hidden"
				onChange={(e) => {
					if (e.target.files) onChange?.(e.target.files);
					e.target.value = "";
				}}
			/>
			<div className="opacity-60 hover:opacity-50">
				{placeholder || (
					<div className="mx-auto flex h-16 w-16 items-center justify-center">
						<Icon icon="eva:cloud-upload-fill" size={28} />
					</div>
				)}
			</div>
		</div>
	);
}
