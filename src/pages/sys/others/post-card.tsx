import { CardContent } from "@/ui/card";
import { Card } from "antd";
import { styles } from "./styles";
import { formatDate } from "date-fns";

type PostCardProps = {
	post: any;
	onViewDetails: () => void;
	isHovered: boolean;
	onHover: () => void;
	onLeave: () => void;
};

// Utility function to truncate text
const truncateText = (text = "", maxLength = 120) => {
	return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

// PostCard component for better organization
const PostCard = ({ post, onViewDetails, isHovered, onHover, onLeave }: PostCardProps) => (
	<Card
		style={{
			...styles.card,
			...(isHovered ? styles.cardHover : {}),
		}}
		onMouseEnter={onHover}
		onMouseLeave={onLeave}
		onClick={onViewDetails}
		role="button"
		tabIndex={0}
		onKeyDown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onViewDetails();
			}
		}}
	>
		<CardContent style={{ padding: 16 }}>
			<div style={styles.cardContent}>
				<img
					src={post.imageUrl}
					alt={`${post.title} thumbnail`}
					style={styles.postImage as React.CSSProperties}
					loading="lazy"
					onError={(e) => {
						(e.target as HTMLImageElement).src =
							"data:image/svg+xml,%3Csvg xmlns='https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f3f4f6'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%236b7280' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
					}}
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h3 style={styles.postTitle}>
						{post.title}
						{post.featured && (
							<span style={styles.featured} aria-label="Featured post">
								⭐ Featured
							</span>
						)}
					</h3>
					<div style={{ marginTop: 6 }}>
						<span style={styles.meta}>By {post.author}</span>
						<span style={styles.meta}>{formatDate(post.date, "PP")}</span>
						<span style={styles.meta}>
							ID: <span style={styles.value}>{post.id}</span>
						</span>
					</div>
					<div style={{ marginTop: 8, marginBottom: 8 }}>
						<span style={styles.label}>{post.category}</span>
						{post.tags.map((tag: any) => (
							<span key={tag} style={styles.tag}>
								#{tag}
							</span>
						))}
					</div>
					<div style={styles.content}>{truncateText(post.content)}</div>
					<div style={styles.stats}>
						<span>
							👁️ <strong>{post.views.toLocaleString()}</strong> Views
						</span>
						<span>
							⭐ <strong>{post.likes}</strong> Likes
						</span>
						<span>
							💬 <strong>{post.commentsCount}</strong> Comments
						</span>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
);

export default PostCard;
