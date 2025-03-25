import { useState, useEffect } from "react";
import styled from "styled-components";
import { IPost } from "../types/post-type";
import { auth, db } from "../firebaseConfig";
import moment from "moment";
import {
  deleteDoc,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
  collection,
} from "firebase/firestore";

const Container = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
  border: 1px solid #353535;
  padding: 10px 15px;
  border-radius: 15px;
  height: auto;
  box-sizing: border-box;
  overflow-wrap: break-word;
  background-color: rgb(36, 36, 36);
`;

const Wrapper = styled.div`
  display: flex;
  gap: 5px;
  align-items: flex-start;
`;

const ProfileArea = styled.div``;
const ProfileImg = styled.img`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: white;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
`;

const UserInfo = styled.div`
  display: flex;
  gap: 5px;
  align-items: flex-end;
`;

const UserEmail = styled.div`
  font-size: 10px;
  color: #52adf8;
`;

const UserName = styled.div`
  font-weight: 700;
  font-size: 13px;
`;

const PostText = styled.div`
  font-size: 15px;
`;

const CreateTime = styled.div`
  font-size: 10px;
  color: #575757;
`;

const Footer = styled.div`
  display: flex;
  gap: 8px;
  margin: 10px 0px;
`;

const Topbar = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Button = styled.button`
  cursor: pointer;
  font-size: 12px;
  padding: 5px;
  border: none;
  background-color: #52adf8;
  color: white;
  border-radius: 5px;
`;

const DeleteBtn = styled(Button)`
  background-color: #ff4747;
`;

const LikeBtn = styled(Button)`
  background-color: #ff8c00;
`;

const CommentBtn = styled(Button)`
  background-color: #4caf50;
`;

const EditBtn = styled(Button)`
  background-color: #2196f3;
`;

const defaultProfileImg =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-2048x2048-cqe5466q.png";

const EditCommentInput = styled.textarea`
  width: 100%;
  height: 60px;
  padding: 5px;
  margin-top: 5px;
  border-radius: 5px;
  font-size: 14px;
`;

export default ({ id, userId, createdAt, nickname, post, photoUrl }: IPost) => {
  const user = auth.currentUser;
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);
  const [hasLiked, setHasLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState(""); // 댓글 입력 상태

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const docRef = doc(db, "posts", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setLikes(data.likeCount || 0);
          setComments(data.commentCount || 0);
          setHasLiked(data.likedBy?.includes(user?.uid) || false);
        } else {
          console.log("문서를 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("문서 조회 오류:", error);
      }
    };

    if (user) {
      checkLikeStatus();
    }
  }, [id, user]);

  const onLike = async () => {
    const docRef = doc(db, "posts", id);
    if (hasLiked) {
      await updateDoc(docRef, {
        likeCount: increment(-1),
        likedBy: arrayRemove(user?.uid),
      });
      setLikes(likes - 1);
    } else {
      await updateDoc(docRef, {
        likeCount: increment(1),
        likedBy: arrayUnion(user?.uid),
      });
      setLikes(likes + 1);
    }
    setHasLiked(!hasLiked);
  };

  const onEdit = async () => {
    const docRef = doc(db, "posts", id);
    try {
      await updateDoc(docRef, {
        post: editedPost,
      });
      setIsEditing(false);
    } catch (e) {
      console.error("댓글 수정 오류:", e);
    }
  };

  const onDeletePost = async () => {
    const isOK = window.confirm("게시글을 삭제하시겠습니까?");
    try {
      if (isOK) {
        const removeDoc = await doc(db, "posts", id);
        await deleteDoc(removeDoc);
        console.log("게시글이 삭제되었습니다.");
      }
    } catch (e) {
      console.error("게시글 삭제 오류:", e);
    }
  };

  const onAddComment = async () => {
    if (!newComment) return;

    const commentData = {
      userId: user?.uid,
      content: newComment,
      createdAt: new Date(),
    };

    const commentsRef = collection(db, "posts", id, "comments");
    try {
      await setDoc(doc(commentsRef), commentData);
      setNewComment(""); // 댓글 입력 필드 초기화
      setComments(comments + 1); // 댓글 수 업데이트
    } catch (error) {
      console.error("댓글 추가 오류:", error);
    }
  };

  // 댓글 기능 추가
  const onCommentClick = () => {
    setShowComments(!showComments);
  };

  return (
    <Container>
      <Wrapper>
        <ProfileArea>
          <ProfileImg src={photoUrl || defaultProfileImg} />
        </ProfileArea>
        <Content>
          <Topbar>
            <UserInfo>
              <UserName>{nickname}</UserName>
              {auth.currentUser && (
                <UserEmail>{auth.currentUser.email}</UserEmail>
              )}
            </UserInfo>
            {user?.uid === userId && (
              <DeleteBtn onClick={onDeletePost}>삭제</DeleteBtn>
            )}
          </Topbar>
          {isEditing ? (
            <div>
              <EditCommentInput
                value={editedPost}
                onChange={(e) => setEditedPost(e.target.value)}
              />
              <Button onClick={onEdit}>수정 완료</Button>
            </div>
          ) : (
            <PostText>{post}</PostText>
          )}
          <CreateTime>{moment(createdAt).fromNow()}</CreateTime>
        </Content>
      </Wrapper>
      <Footer>
        <LikeBtn onClick={onLike}>
          {hasLiked ? `좋아요 ${likes}` : `좋아요 ${likes}`}
        </LikeBtn>
        <CommentBtn onClick={onCommentClick}>댓글 {comments}</CommentBtn>
        {user?.uid === userId && (
          <EditBtn onClick={() => setIsEditing(true)}>수정</EditBtn>
        )}
      </Footer>
      {/* 댓글 섹션 추가 */}
      {showComments && (
        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 작성하세요"
          />
          <Button onClick={onAddComment}>댓글 추가</Button>
          {/* 댓글 목록을 여기서 표시할 수 있습니다 */}
        </div>
      )}
    </Container>
  );
};
