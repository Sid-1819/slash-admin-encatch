import { useEffect, CSSProperties } from "react";
import { format } from "date-fns";
import { styles } from "./styles";

type PostCardProps = {
	post: any;
	onClose: () => void;
};

// PostModal component for better organization
const PostModal = ({ post, onClose }: PostCardProps) => {
	// Handle escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		document.addEventListener("keydown", handleEscape);
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [onClose]);

	// Fix style type issues by ensuring proper CSS types
	const modalOverlayStyle: CSSProperties = {
		...styles.modalOverlay,
		position: "fixed",
		background: styles.modalOverlay.background,
	};

	const modalContentStyle: CSSProperties = {
		...styles.modalContent,
		overflowY: "auto" as const,
		position: styles.modalContent.position as CSSProperties["position"],
	};

	const closeButtonStyle: CSSProperties = {
		...styles.closeButton,
		position: "absolute" as const,
	};

	const postImageStyle: CSSProperties = {
		...styles.postImageModal,
		objectFit: "cover" as const,
	};

	return (
		<div
			style={modalOverlayStyle}
			aria-labelledby="modal-title"
			role="dialog"
			aria-modal="true"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
					onClose();
				}
			}}
		>
			<div
				style={modalContentStyle}
				onClick={(e) => e.stopPropagation()}
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						onClose();
					}
				}}
			>
				<button
					style={closeButtonStyle}
					onClick={onClose}
					aria-label="Close modal"
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = styles.closeButtonHover.backgroundColor;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = styles.closeButton.background;
					}}
				>
					✕
				</button>

				<div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
					<img
						src={post.imageUrl}
						alt={`${post.title} thumbnail`}
						style={postImageStyle}
						loading="lazy"
						onError={(e) => {
							(e.target as HTMLImageElement).src =
								"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='45' text-anchor='middle' fill='%236b7280' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
						}}
					/>
					<div style={{ flex: 1 }}>
						<h2 id="modal-title" style={styles.postTitleModal}>
							{post.title}
							{post.featured && (
								<span style={styles.featured} aria-label="Featured post">
									⭐ Featured
								</span>
							)}
						</h2>
						<div style={{ marginTop: 6 }}>
							<span style={styles.meta}>By {post.author}</span>
							<span style={styles.meta}>{format(new Date(post.date), "PP")}</span>
							<span style={styles.meta}>
								ID: <span style={styles.value}>{post.id}</span>
							</span>
						</div>
						<div style={{ marginTop: 8, marginBottom: 12 }}>
							<span style={styles.label}>{post.category}</span>
							{post.tags?.map((tag: any) => (
								<span key={tag} style={styles.tag}>
									#{tag}
								</span>
							))}
						</div>
					</div>
				</div>

				<div style={{ marginTop: 20, color: "#334155", lineHeight: 1.7, fontSize: 16 }}>{post.content}</div>

				<div style={{ marginTop: 20, display: "flex", gap: "1.6em", fontSize: 15, color: "#475569" }}>
					<span>
						👁️ <strong>{post.views?.toLocaleString() || 0}</strong> Views
					</span>
					<span>
						⭐ <strong>{post.likes || 0}</strong> Likes
					</span>
					<span>
						💬 <strong>{post.commentsCount || 0}</strong> Comments
					</span>
				</div>
			</div>
		</div>
	);
};

export default PostModal;
