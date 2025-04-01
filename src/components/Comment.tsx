import { useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

const CommentWrapper = styled.div`
  margin-top: 10px;
`;

const CommentCount = styled.div`
  font-size: 13px;
  color: #aaa;
  margin-bottom: 5px;
`;

const InputArea = styled.div`
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
`;

const CommentInput = styled.textarea`
  flex: 1;
  height: 50px;
  resize: none;
  border-radius: 5px;
  padding: 5px;
  font-size: 14px;
`;

const AddButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CommentItem = styled.div`
  font-size: 14px;
  color: #eaeaea;
`;

interface Comment {
  userId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  initialCount: number;
  onCommentAdded?: (newComment: Comment) => void;
}

const CommentSection = ({
  postId,
  initialComments,
  initialCount,
  onCommentAdded,
}: CommentSectionProps) => {
  const user = auth.currentUser;
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const loadComments = async () => {
      const commentsRef = collection(db, "posts", postId, "comments");
      const commentSnapshot = await getDocs(commentsRef);
      const loadedComments = commentSnapshot.docs.map(
        (doc) => doc.data() as Comment
      );
      // Removed local state update to ensure parent state is the source of truth
    };

    loadComments();
  }, [postId]);

  const onAddComment = async () => {
    if (!newComment.trim()) return;

    const commentData: Comment = {
      userId: user?.uid || "",
      nickname: user?.displayName || "익명",
      content: newComment,
      createdAt: new Date().getTime(),
    };

    const commentsRef = collection(db, "posts", postId, "comments");

    try {
      await setDoc(doc(commentsRef), commentData);
      setNewComment("");
      if (onCommentAdded) {
        onCommentAdded(commentData);
      }
    } catch (error) {
      console.error("댓글 추가 오류:", error);
    }
  };

  return (
    <CommentWrapper>
      <CommentCount>댓글 {initialComments.length}개</CommentCount>
      <InputArea>
        <CommentInput
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 작성하세요"
        />
        <AddButton onClick={onAddComment}>댓글 추가</AddButton>
      </InputArea>
      <CommentList>
        {initialComments.map((comment, index) => (
          <CommentItem key={index}>
            <strong>{comment.nickname}</strong>: {comment.content}
          </CommentItem>
        ))}
      </CommentList>
    </CommentWrapper>
  );
};

export default CommentSection;
