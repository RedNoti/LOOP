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
          value={editingCommentId ? editingContent : newComment}
          onChange={(e) =>
            editingCommentId
              ? setEditingContent(e.target.value)
              : setNewComment(e.target.value)
          }
          placeholder={
            editingCommentId ? "댓글을 수정하세요" : "댓글을 작성하세요"
          }
        />
        <AddButton onClick={editingCommentId ? onSaveEdit : onAddComment}>
          {editingCommentId ? "수정" : "댓글 추가"}
        </AddButton>
      </InputArea>
      <CommentList>
        {comments.map((comment) => (
          <CommentItem key={comment.id}>
            <CommentContent>
              <CommentText>
                <strong>{comment.nickname}</strong>: {comment.content}
                <ButtonGroup>
                  {comment.userId === user?.uid && !editingCommentId && (
                    <>
                      <ActionButton
                        onClick={() =>
                          onEditComment(comment.id!, comment.content)
                        }
                      >
                        <img
                          src="/icon/pencil_icon.svg"
                          alt="수정"
                          width="12"
                          height="12"
                        />
                      </ActionButton>
                      <ActionButton
                        onClick={() => onDeleteComment(comment.id!)}
                      >
                        <img
                          src="/icon/Delete_Icon.svg"
                          alt="삭제"
                          width="12"
                          height="12"
                        />
                      </ActionButton>
                    </>
                  )}
                </ButtonGroup>
              </CommentText>
            </CommentContent>
          </CommentItem>
        ))}
      </CommentList>
    </CommentWrapper>
  );
};

// 스타일 생략 - 기존 그대로 유지
const CommentWrapper = styled.div`
  margin-top: 20px;
  animation: slideDown 0.3s ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
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
  height: 45px;
  resize: none;
  border-radius: 5px;
  padding: 5px;
  font-size: 12px;
  width: 50%;
  background-color: #b0b0b0;
  box-sizing: border-box;
  &::placeholder {
    font-size: 11px;
  }
`;
const AddButton = styled.button`
  height: 45px;
  min-width: 80px;
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
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
const CommentContent = styled.div`
  width: 100%;
`;
const CommentText = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;
const ButtonGroup = styled.div`
  display: flex;
  gap: 2px;
  min-width: 52px; /* 버튼 2개 + 간격 2px의 최소 너비 */
`;
const ActionButton = styled.button`
  height: 24px;
  width: 24px;
  padding: 0;
  background-color: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
`;

export default CommentSection;
