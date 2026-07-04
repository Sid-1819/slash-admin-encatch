import { Icon } from "@/components/icon";
import { Text } from "@/ui/typography";
import { fBytes } from "@/utils/format-number";
import { useCallback, useRef, useState } from "react";

interface Props {
	defaultAvatar?: string;
	helperText?: React.ReactElement | string;
	accept?: string;
	onChange?: (file: File) => void;
}

const MAX_SIZE = 3145728; // 3MB

function beforeAvatarUpload(file: File): boolean {
	const isValidType = /\.(jpeg|jpg|png|gif)$/i.test(file.name);
	const isValidSize = file.size <= MAX_SIZE;
	return isValidType && isValidSize;
}

export function UploadAvatar({ helperText, defaultAvatar = "", accept = "image/jpeg,image/jpg,image/png,image/gif", onChange }: Props) {
	const [imageUrl, setImageUrl] = useState<string>(defaultAvatar);
	const [isHover, setIsHover] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (!beforeAvatarUpload(file)) return;
			const url = URL.createObjectURL(file);
			setImageUrl(url);
			onChange?.(file);
			e.target.value = "";
		},
		[onChange],
	);

	const renderPreview = <img src={imageUrl} alt="" className="absolute h-full w-full rounded-full object-cover" />;

	const renderPlaceholder = (
		<div
			className={`absolute z-10 flex h-full w-full flex-col items-center justify-center rounded-full transition-colors ${!imageUrl || isHover ? "bg-muted" : "bg-transparent"}`}
		>
			<Icon icon="solar:camera-add-bold" size={32} />
			<div className="mt-1 text-xs text-foreground">Upload Photo</div>
		</div>
	);

	const renderContent = (
		<div
			className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full cursor-pointer"
			onMouseEnter={() => setIsHover(true)}
			onMouseLeave={() => setIsHover(false)}
			onClick={() => inputRef.current?.click()}
		>
			{imageUrl ? renderPreview : null}
			{!imageUrl || isHover ? renderPlaceholder : null}
		</div>
	);

	const defaultHelperText = (
		<Text variant="caption" color="secondary">
			Allowed *.jpeg, *.jpg, *.png, *.gif
			<br /> max size of {fBytes(MAX_SIZE)}
		</Text>
	);

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="relative h-36 w-36 rounded-full border-2 border-dashed border-border p-1">
				<input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
				{renderContent}
			</div>
			<div className="text-center">{helperText || defaultHelperText}</div>
		</div>
	);
}
