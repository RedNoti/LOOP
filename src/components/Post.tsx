import { useState, useEffect } from "react";
import styled from "styled-components";
import { IPost } from "../types/post-type";
import { auth, db } from "../firebaseConfig";
import axios from "axios";
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
  max-width: 100%;
  margin: 0;
  border: 1px solid #353535;
  padding: 10px 15px;
  border-radius: 15px;
  height: auto;
  box-sizing: border-box;
  overflow-wrap: break-word;
  background-color: rgb(36, 36, 36);
  margin-bottom: 16px;
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
  object-fit: cover;
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

const ImageContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
  overflow-x: auto;
`;

const PostImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
`;

export default ({
  id,
  userId,
  createdAt,
  nickname,
  post,
  photoUrls,
  photoUrl,
  email,
}: IPost) => {
  const user = auth.currentUser;
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);
  const [hasLiked, setHasLiked] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl || defaultProfileImg);
  const [currentNickname, setCurrentNickname] = useState(nickname);

  // 컴포넌트 마운트 시 최신 프로필 정보 가져오기
  useEffect(() => {
    const fetchLatestProfileInfo = async () => {
      try {
        // Firestore에서 최신 프로필 정보 확인
        const profileDoc = await getDoc(doc(db, "profiles", userId));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          if (data.photoUrl) setCurrentPhotoUrl(data.photoUrl);
          if (data.name) setCurrentNickname(data.name);
        }
      } catch (error) {
        console.error("프로필 정보 가져오기 실패:", error);
      }
    };

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

    fetchLatestProfileInfo();
  }, [id, user, userId, photoUrl, nickname]);

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

  const onDeleteComment = async () => {
    const isOK = window.confirm("댓글을 삭제하시겠습니까?");
    try {
      if (isOK) {
        // Firestore에서 문서 삭제
        const removeDoc = doc(db, "posts", id);
        await deleteDoc(removeDoc);

        // 첨부된 이미지 삭제 요청
        if (photoUrls && photoUrls.length > 0) {
          for (const filename of photoUrls) {
            try {
              await axios.post("http://uploadloop.kro.kr:4000/delete", {
                url: `http://uploadloop.kro.kr:4000/postphoto/${filename}`,
              });
            } catch (err) {
              console.error("이미지 삭제 실패:", err);
            }
          }
        }

        console.log("게시글 및 이미지 삭제 완료");
      }
    } catch (e) {
      console.error("댓글 삭제 오류:", e);
    }
  };

  return (
    <Container>
      <Wrapper>
        <ProfileArea>
          <ProfileImg src={currentPhotoUrl} />
        </ProfileArea>
        <Content>
          <Topbar>
            <UserInfo>
              <UserName>{currentNickname}</UserName>
              <UserEmail>{email}</UserEmail>
            </UserInfo>
            {user?.uid === userId && (
              <DeleteBtn onClick={onDeleteComment}>삭제</DeleteBtn>
            )}
          </Topbar>
          {!isEditing ? (
            <>
              <PostText>{post}</PostText>
              {photoUrls && photoUrls.length > 0 && (
                <ImageContainer>
                  {photoUrls.map((url, index) => (
                    <PostImage
                      key={index}
                      src={`http://uploadloop.kro.kr:4000/postphoto/${url}`}
                      alt={`Post image ${index + 1}`}
                    />
                  ))}
                </ImageContainer>
              )}
              <CreateTime>{moment(createdAt).fromNow()}</CreateTime>
            </>
          ) : (
            <div>
              <EditCommentInput
                value={editedPost}
                onChange={(e) => setEditedPost(e.target.value)}
              />
              <Button onClick={onEdit}>수정 완료</Button>
            </div>
          )}
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