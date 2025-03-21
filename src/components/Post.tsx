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
} from "firebase/firestore";

const Container = styled.div`
  width: 100%;
  max-width: 600px;
  margin-left: 0;
  margin-right: 0;
  border: 1px solid #353535;
  padding: 10px 15px;
  border-radius: 30px;
  height: auto;
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

// 댓글 수정 컴포넌트
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
  const [likes, setLikes] = useState(0); // 좋아요 카운트
  const [comments, setComments] = useState(0); // 댓글 카운트
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post); // 수정할 댓글 내용 상태
  const [hasLiked, setHasLiked] = useState(false); // 좋아요 여부 상태

  useEffect(() => {
    // 컴포넌트가 마운트 될 때 좋아요 상태를 확인
    const checkLikeStatus = async () => {
      try {
        const docRef = doc(db, "posts", id); // Firestore에서 특정 문서 참조 생성
        const docSnap = await getDoc(docRef); // getDoc으로 문서 스냅샷 가져오기

        if (docSnap.exists()) {
          const data = docSnap.data();
          setLikes(data.likeCount || 0);
          setComments(data.commentCount || 0);
          setHasLiked(data.likedBy?.includes(user?.uid) || false); // 현재 사용자가 좋아요를 눌렀는지 확인
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

  // 좋아요 클릭 시
  const onLike = async () => {
    const docRef = doc(db, "posts", id);
    if (hasLiked) {
      // 좋아요 취소
      await updateDoc(docRef, {
        likeCount: increment(-1), // likeCount를 1 감소시킴
        likedBy: arrayRemove(user?.uid), // 사용자 UID를 likedBy 배열에서 제거
      });
      setLikes(likes - 1); // 상태 업데이트
    } else {
      // 좋아요
      await updateDoc(docRef, {
        likeCount: increment(1), // likeCount를 1 증가시킴
        likedBy: arrayUnion(user?.uid), // 사용자 UID를 likedBy 배열에 추가
      });
      setLikes(likes + 1); // 상태 업데이트
    }
    setHasLiked(!hasLiked); // 좋아요 상태 토글
  };

  // 댓글 수정 시
  const onEdit = async () => {
    const docRef = doc(db, "posts", id);
    try {
      await updateDoc(docRef, {
        post: editedPost, // 수정된 게시글 내용으로 업데이트
      });
      setIsEditing(false); // 수정 모드 종료
    } catch (e) {
      console.error("댓글 수정 오류:", e);
    }
  };

  // 댓글 삭제 시
  const onDeleteComment = async () => {
    const isOK = window.confirm("댓글을 삭제하시겠습니까?");
    try {
      if (isOK) {
        const removeDoc = await doc(db, "posts", id);
        await deleteDoc(removeDoc);
      }
    } catch (e) {
      console.error("댓글 삭제 오류:", e);
    }
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
              <DeleteBtn onClick={onDeleteComment}>삭제</DeleteBtn>
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
        <CommentBtn onClick={onDeleteComment}>댓글 {comments}</CommentBtn>
        {user?.uid === userId && (
          <EditBtn onClick={() => setIsEditing(true)}>수정</EditBtn>
        )}
      </Footer>
    </Container>
  );
};
