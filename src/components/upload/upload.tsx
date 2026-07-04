import { useCallback, useRef, useState } from "react";
import UploadIllustration from "./upload-illustration";
import UploadListItem from "./upload-list-item";

export interface UploadFile {
	uid: string;
	name: string;
	size?: number;
	type?: string;
	status?: "uploading" | "done" | "error" | "removed";
	originFileObj?: File;
	url?: string;
	percent?: number;
}

interface UploadProps {
	thumbnail?: boolean;
	multiple?: boolean;
	accept?: string;
	fileList?: UploadFile[];
	onChange?: (info: { file: UploadFile; fileList: UploadFile[] }) => void;
	beforeUpload?: (file: File) => boolean | Promise<boolean>;
	customRequest?: (options: { file: File; onSuccess?: () => void; onError?: (err: Error) => void }) => void;
}

export function Upload({ thumbnail = false, multiple = true, accept, fileList: controlledFileList, onChange, beforeUpload, customRequest }: UploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [internalFileList, setInternalFileList] = useState<UploadFile[]>([]);
	const fileList = controlledFileList ?? internalFileList;

	const handleFiles = useCallback(
		async (files: FileList) => {
			const newFiles: UploadFile[] = [];
			for (const file of Array.from(files)) {
				if (beforeUpload) {
					const result = await beforeUpload(file);
					if (!result) continue;
				}
				const uploadFile: UploadFile = {
					uid: `${Date.now()}-${Math.random()}`,
					name: file.name,
					size: file.size,
					type: file.type,
					status: "done",
					originFileObj: file,
				};
				newFiles.push(uploadFile);

				if (customRequest) {
					uploadFile.status = "uploading";
					customRequest({
						file,
						onSuccess: () => {
							uploadFile.status = "done";
						},
						onError: () => {
							uploadFile.status = "error";
						},
					});
				}
			}
			const updatedList = [...fileList, ...newFiles];
			setInternalFileList(updatedList);
			if (onChange && newFiles.length > 0) {
				onChange({ file: newFiles[newFiles.length - 1], fileList: updatedList });
			}
		},
		[fileList, beforeUpload, customRequest, onChange],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (e.dataTransfer.files.length > 0) {
				handleFiles(e.dataTransfer.files);
			}
		},
		[handleFiles],
	);

	const removeFile = (uid: string) => {
		const updatedList = fileList.filter((f) => f.uid !== uid);
		setInternalFileList(updatedList);
	};

	return (
		<div>
			<div
				className="cursor-pointer rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
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
						if (e.target.files) handleFiles(e.target.files);
						e.target.value = "";
					}}
				/>
				<div className="opacity-100 hover:opacity-80">
					<p className="m-auto max-w-[200px]">
						<UploadIllustration />
					</p>
					<div>
						<h5 className="mt-4 text-foreground">Drop or Select file</h5>
						<p className="text-sm text-muted-foreground">
							Drop files here or click
							<span className="mx-2 text-primary underline">browse</span>
							through your machine
						</p>
					</div>
				</div>
			</div>
			{fileList.length > 0 && (
				<div className={thumbnail ? "mt-4 flex flex-wrap gap-2" : "mt-4 space-y-2"}>
					{fileList.map((file) => (
						<UploadListItem key={file.uid} file={file} actions={{ remove: () => removeFile(file.uid) }} thumbnail={thumbnail} />
					))}
				</div>
			)}
		</div>
	);
}
