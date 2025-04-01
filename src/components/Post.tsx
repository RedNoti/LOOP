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
  getDocs,
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
  display: flex;
  align-items: center;
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
  resize: none;
  overflow-y: auto;
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

const Post = ({
  id,
  userId,
  createdAt,
  nickname,
  post,
  photoUrl,
  comments,
}: IPost) => {
  const user = auth.currentUser;
  const [likes, setLikes] = useState(0);
  const [commentCount, setCommentCount] = useState(
    comments ? comments.length : 0
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);
  const [hasLiked, setHasLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentList, setCommentList] = useState<
    { userId: string; nickname: string; content: string; createdAt: number }[]
  >(comments || []);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(
    photoUrl || defaultProfileImg
  );
  const [currentNickname, setCurrentNickname] = useState(nickname);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]); // Added state for photoUrls

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const docRef = doc(db, "posts", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLikes(data.likeCount || 0);
          setCommentCount(data.commentCount || 0);
          setHasLiked(data.likedBy?.includes(user?.uid) || false);
          setPhotoUrls(data.photoUrls || []); // Update photoUrls state
        }
      } catch (error) {
        console.error("문서 조회 오류:", error);
      }
    };

    const loadComments = async () => {
      const commentsRef = collection(db, "posts", id, "comments");
      const commentSnapshot = await getDocs(commentsRef);
      const commentList = commentSnapshot.docs.map(
        (doc) =>
          doc.data() as {
            userId: string;
            nickname: string;
            content: string;
            createdAt: number;
          }
      );
      setCommentList(commentList);
    };

    const fetchLatestProfileInfo = async () => {
      try {
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

    if (user) {
      checkLikeStatus();
      loadComments();
      fetchLatestProfileInfo();
    }
  }, [id, user, userId]);

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
      await updateDoc(docRef, { post: editedPost });
      setIsEditing(false);
    } catch (e) {
      console.error("게시글 수정 오류:", e);
    }
  };

  const onDeletePost = async () => {
    if (window.confirm("게시글을 삭제하시겠습니까?")) {
      try {
        const removeDoc = await doc(db, "posts", id);
        await deleteDoc(removeDoc);
        console.log("게시글이 삭제되었습니다.");
      } catch (e) {
        console.error("게시글 삭제 오류:", e);
      }
    }
  };

  const onAddComment = async () => {
    if (!newComment) return;
    const commentData = {
      userId: user?.uid || "",
      nickname: user?.displayName || "익명",
      content: newComment,
      createdAt: new Date().getTime(),
    };
    const commentsRef = collection(db, "posts", id, "comments");
    try {
      await setDoc(doc(commentsRef), commentData);
      setNewComment("");
      setCommentCount(commentCount + 1);
      setCommentList((prev) => [...prev, commentData]);
    } catch (error) {
      console.error("댓글 추가 오류:", error);
    }
  };

  const onCommentClick = () => setShowComments(!showComments);

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
              {auth.currentUser && (
                <UserEmail>{auth.currentUser.email}</UserEmail>
              )}
            </UserInfo>
            {user?.uid === userId && (
              <DeleteBtn onClick={onDeletePost}>삭제</DeleteBtn>
            )}
          </Topbar>
          {isEditing ? (
            <>
              <EditCommentInput
                value={editedPost}
                onChange={(e) => setEditedPost(e.target.value)}
              />
              <Button onClick={onEdit}>수정 완료</Button>
            </>
          ) : (
            <PostText>{post}</PostText>
          )}
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
        </Content>
      </Wrapper>
      <Footer>
        <LikeBtn onClick={onLike}>
          <img
            src={hasLiked ? "/heart2.png" : "/heart.png"}
            alt="Like"
            width="15"
            height="15"
          />
          <span>{likes}</span>
        </LikeBtn>
        <CommentBtn onClick={onCommentClick}>
          <img src="/comment.png" alt="Comment" width="15" height="15" />
          <span>{commentCount}</span>
        </CommentBtn>
        {user?.uid === userId && (
          <EditBtn onClick={() => setIsEditing(true)}>수정</EditBtn>
        )}
      </Footer>

      {showComments && (
        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 작성하세요"
          />
          <Button onClick={onAddComment}>댓글 추가</Button>
          <div>
            {commentList.map((comment, index) => (
              <div key={index}>
                <strong>{comment.nickname}</strong>: {comment.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
};

export default Post;
