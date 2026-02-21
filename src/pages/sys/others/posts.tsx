import { _encatch } from "@/lib/encatch";
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
		_encatch.trackEvent("post_modal_opened");
	}, []);

	const handleCloseModal = useCallback(() => {
		_encatch.trackEvent("post_modal_closed");
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
