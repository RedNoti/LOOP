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
import { useTheme } from "../components/ThemeContext";

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
  onCommentDeleted?: (deletedCommentId: string) => void;
}

const CommentSection = ({
  postId,
  initialComments,
  initialCount,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) => {
  const { isDarkMode } = useTheme();
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
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onCommentDeleted) onCommentDeleted(commentId);
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

  const onCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <CommentWrapper>
      <CommentHeader>
        <CommentCount $isDark={isDarkMode}>
          댓글 {comments.length}개
        </CommentCount>
      </CommentHeader>

      <InputSection>
        <CommentInputContainer $isDark={isDarkMode}>
          <CommentInput
            $isDark={isDarkMode}
            value={editingCommentId ? editingContent : newComment}
            onChange={(e) =>
              editingCommentId
                ? setEditingContent(e.target.value)
                : setNewComment(e.target.value)
            }
            placeholder={
              editingCommentId ? "댓글을 수정하세요..." : "댓글을 작성하세요..."
            }
            rows={2}
          />
          <InputActions>
            {editingCommentId ? (
              <>
                <CancelButton $isDark={isDarkMode} onClick={onCancelEdit}>
                  취소
                </CancelButton>
                <SubmitButton onClick={onSaveEdit}>수정</SubmitButton>
              </>
            ) : (
              <SubmitButton onClick={onAddComment}>게시</SubmitButton>
            )}
          </InputActions>
        </CommentInputContainer>
      </InputSection>

      <CommentList>
        {comments.map((comment) => (
          <CommentItem $isDark={isDarkMode} key={comment.id}>
            <CommentContent>
              <CommentInfo>
                <CommentAuthor $isDark={isDarkMode}>
                  {comment.nickname}
                </CommentAuthor>
                <CommentTime $isDark={isDarkMode}>
                  {formatTimeAgo(comment.createdAt)}
                </CommentTime>
              </CommentInfo>
              <CommentText $isDark={isDarkMode}>{comment.content}</CommentText>
              {comment.userId === user?.uid && !editingCommentId && (
                <CommentActions>
                  <ActionButton
                    $isDark={isDarkMode}
                    onClick={() => onEditComment(comment.id!, comment.content)}
                  >
                    <EditIcon>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                          fill="currentColor"
                        />
                        <path
                          d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                          fill="currentColor"
                        />
                      </svg>
                    </EditIcon>
                    수정
                  </ActionButton>
                  <ActionButton
                    $isDark={isDarkMode}
                    onClick={() => onDeleteComment(comment.id!)}
                  >
                    <DeleteIcon>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                          fill="currentColor"
                        />
                      </svg>
                    </DeleteIcon>
                    삭제
                  </ActionButton>
                </CommentActions>
              )}
            </CommentContent>
          </CommentItem>
        ))}
      </CommentList>

      {comments.length === 0 && (
        <EmptyState>
          <EmptyIcon $isDark={isDarkMode}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </EmptyIcon>
          <EmptyText $isDark={isDarkMode}>아직 댓글이 없습니다.</EmptyText>
          <EmptySubText $isDark={isDarkMode}>
            첫 번째 댓글을 작성해보세요!
          </EmptySubText>
        </EmptyState>
      )}
    </CommentWrapper>
  );
};

// 스타일드 컴포넌트
const CommentWrapper = styled.div`
  padding: 20px 24px;
`;

const CommentHeader = styled.div`
  margin-bottom: 16px;
`;

const CommentCount = styled.div<{ $isDark: boolean }>`
  font-size: 15px;
  font-weight: 600;
  color: ${(props) => (props.$isDark ? "#ffffff" : "#1a1a1a")};
`;

const InputSection = styled.div`
  margin-bottom: 20px;
`;

const CommentInputContainer = styled.div<{ $isDark: boolean }>`
  background: ${(props) => (props.$isDark ? "#2c2c2c" : "#ffffff")};
  border-radius: 12px;
  border: 2px solid ${(props) => (props.$isDark ? "#404040" : "#f0f0f0")};
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: #007aff;
  }
`;

const CommentInput = styled.textarea<{ $isDark: boolean }>`
  width: 100%;
  padding: 16px;
  border: none;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  font-family: inherit;
  color: ${(props) => (props.$isDark ? "#ffffff" : "#1a1a1a")};
  background: transparent;
  box-sizing: border-box;

  &::placeholder {
    color: ${(props) => (props.$isDark ? "#888888" : "#8e8e93")};
  }
`;

const InputActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
`;

const SubmitButton = styled.button`
  padding: 8px 16px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #0051d0;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #c7c7cc;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button<{ $isDark: boolean }>`
  padding: 8px 16px;
  background: ${(props) => (props.$isDark ? "#333333" : "#f8f9fa")};
  color: ${(props) => (props.$isDark ? "#aaaaaa" : "#6c757d")};
  border: 1px solid ${(props) => (props.$isDark ? "#404040" : "#e9ecef")};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) => (props.$isDark ? "#404040" : "#e9ecef")};
    color: ${(props) => (props.$isDark ? "#ffffff" : "#495057")};
  }
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CommentItem = styled.div<{ $isDark: boolean }>`
  background: ${(props) => (props.$isDark ? "#2c2c2c" : "#ffffff")};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${(props) => (props.$isDark ? "#404040" : "#f0f0f0")};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => (props.$isDark ? "#555555" : "#e0e0e0")};
    box-shadow: 0 2px 8px
      ${(props) =>
        props.$isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.04)"};
  }
`;

const CommentContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CommentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CommentAuthor = styled.div<{ $isDark: boolean }>`
  font-weight: 600;
  font-size: 14px;
  color: ${(props) => (props.$isDark ? "#ffffff" : "#1a1a1a")};
`;

const CommentTime = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  color: ${(props) => (props.$isDark ? "#aaaaaa" : "#8e8e93")};
`;

const CommentText = styled.div<{ $isDark: boolean }>`
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => (props.$isDark ? "#ffffff" : "#1a1a1a")};
  word-break: break-word;
  white-space: pre-wrap;
`;

const CommentActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 4px;
`;

const ActionButton = styled.button<{ $isDark: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: none;
  border: none;
  color: ${(props) => (props.$isDark ? "#aaaaaa" : "#8e8e93")};
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) => (props.$isDark ? "#404040" : "#f8f9fa")};
    color: ${(props) => (props.$isDark ? "#ffffff" : "#495057")};
  }
`;

const EditIcon = styled.span`
  display: flex;
  align-items: center;
  color: #007aff;
`;

const DeleteIcon = styled.span`
  display: flex;
  align-items: center;
  color: #ff6b6b;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div<{ $isDark: boolean }>`
  color: ${(props) => (props.$isDark ? "#666666" : "#c7c7cc")};
  margin-bottom: 12px;
`;

const EmptyText = styled.div<{ $isDark: boolean }>`
  font-size: 16px;
  font-weight: 500;
  color: ${(props) => (props.$isDark ? "#aaaaaa" : "#8e8e93")};
  margin-bottom: 4px;
`;

const EmptySubText = styled.div<{ $isDark: boolean }>`
  font-size: 14px;
  color: ${(props) => (props.$isDark ? "#666666" : "#c7c7cc")};
`;

export default CommentSection;
