// Comment.tsx
import { useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

interface Comment {
  userId: string;
  nickname: string;
  content: string;
  createdAt: number;
  id?: string;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  initialCount: number;
  onCommentAdded?: (newComment: Comment) => void;
  onCommentDeleted?: (deletedCommentId: string) => void; // ✅ 추가
}

const CommentSection = ({
  postId,
  initialComments,
  initialCount,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) => {
  const user = auth.currentUser;
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    const loadComments = async () => {
      const commentsRef = collection(db, "posts", postId, "comments");
      const commentSnapshot = await getDocs(commentsRef);
      const loadedComments = commentSnapshot.docs.map((doc) => ({
        ...(doc.data() as Comment),
        id: doc.id,
      }));
      setComments(loadedComments);
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

    try {
      const docRef = await addDoc(
        collection(db, "posts", postId, "comments"),
        commentData
      );
      commentData.id = docRef.id;
      setComments((prev) => [...prev, commentData]);
      setNewComment("");
      if (onCommentAdded) onCommentAdded(commentData);
    } catch (error) {
      console.error("댓글 추가 오류:", error);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onCommentDeleted) onCommentDeleted(commentId); // ✅ 외부로 알림
    } catch (error) {
      console.error("댓글 삭제 오류:", error);
    }
  };

  const onEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  const onSaveEdit = async () => {
    if (!editingCommentId || !editingContent.trim()) return;

    try {
      const ref = doc(db, "posts", postId, "comments", editingCommentId);
      await setDoc(ref, { content: editingContent }, { merge: true });
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === editingCommentId
            ? { ...comment, content: editingContent }
            : comment
        )
      );
      setEditingCommentId(null);
      setEditingContent("");
    } catch (error) {
      console.error("댓글 수정 오류:", error);
    }
  };

  return (
    <CommentWrapper>
      <CommentCount>댓글 {comments.length}개</CommentCount>
      <InputArea>
        <CommentInput
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 작성하세요"
        />
        <AddButton onClick={onAddComment}>댓글 추가</AddButton>
      </InputArea>
      <CommentList>
        {comments.map((comment) => (
          <CommentItem key={comment.id}>
            {editingCommentId === comment.id ? (
              <InputArea>
                <CommentInput
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                />
                <AddButton onClick={onSaveEdit}>저장</AddButton>
              </InputArea>
            ) : (
              <>
                <strong>{comment.nickname}</strong>: {comment.content}
                {comment.userId === user?.uid && (
                  <>
                    <ActionButton
                      onClick={() =>
                        onEditComment(comment.id!, comment.content)
                      }
                    >
                      <img src="/edit.png" alt="수정" width="15" />
                    </ActionButton>
                    <ActionButton onClick={() => onDeleteComment(comment.id!)}>
                      <img src="/delete.png" alt="삭제" width="15" />
                    </ActionButton>
                  </>
                )}
              </>
            )}
          </CommentItem>
        ))}
      </CommentList>
    </CommentWrapper>
  );
};

// 스타일 생략 - 기존 그대로 유지
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
  height: 50px;
  resize: none;
  border-radius: 5px;
  padding: 5px;
  font-size: 14px;
  width: 50%;
  background-color: #b0b0b0;
  box-sizing: border-box;
`;
const AddButton = styled.button`
  height: 50px;
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
const ActionButton = styled.button`
  height: 30px;
  margin-left: 5px;
  padding: 0 8px;
  background-color: #555;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
`;

export default CommentSection;
