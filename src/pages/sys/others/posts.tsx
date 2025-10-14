import { useState, useCallback } from "react";
import PostCard from "./post-card";
import PostModal from "./post-modal";
import { POSTS } from "./data";
import { styles } from "./styles";

export default function PostsListPage() {
	const [selectedPost, setSelectedPost] = useState(null);
	const [hoveredPostId, setHoveredPostId] = useState(null);

	// Memoized handlers for better performance
	const handleViewDetails = useCallback((post: any) => {
		setSelectedPost(post);
		window.encatch.trackEvent("customEvent", {
			postModalOpened: "Post modal opened",
		});
	}, []);

	const handleCloseModal = useCallback(() => {
		window.encatch.trackEvent("customEvent", {
			postModalClosed: "Post modal closed",
		});
		setSelectedPost(null);
	}, []);

	const handleMouseEnter = useCallback((postId: any) => {
		setHoveredPostId(postId);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setHoveredPostId(null);
	}, []);

	return (
		<>
			<div style={styles.container}>
				{POSTS.map((post) => (
					<PostCard
						key={post.id}
						post={post}
						onViewDetails={() => handleViewDetails(post)}
						isHovered={hoveredPostId === post.id}
						onHover={() => handleMouseEnter(post.id)}
						onLeave={handleMouseLeave}
					/>
				))}
			</div>

			{selectedPost && <PostModal post={selectedPost} onClose={handleCloseModal} />}
		</>
	);
}
