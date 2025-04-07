import { useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import CommentSection from "./Comment"; // 대소문자 확인!

interface PostProps {
  id: string;
  userId: string;
  nickname: string;
  post: string;
  createdAt: number;
  photoUrl?: string;
  comments?: {
    userId: string;
    nickname: string;
    content: string;
    createdAt: number;
  }[];
}

const defaultProfileImg =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-2048x2048-cqe5466q.png";

const Post = ({
  id,
  userId,
  nickname,
  post,
  createdAt,
  photoUrl,
  comments,
}: PostProps) => {
  const [commentList, setCommentList] = useState(comments || []);
  const user = auth.currentUser;
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(
    photoUrl
  );
  const [currentNickname, setCurrentNickname] = useState<string | undefined>(
    nickname
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);

  useEffect(() => {
    const fetchPost = async () => {
      const postRef = doc(db, "posts", id);
      const docSnap = await getDoc(postRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLikes(data.likeCount || 0);
        setHasLiked(data.likedBy?.includes(user?.uid));
        setCurrentPhotoUrl(data.photoUrl || defaultProfileImg);
        setCurrentNickname(data.nickname || nickname);
        setPhotoUrls(data.photoUrls || []);
      }
    };

    fetchPost();
  }, [id, user?.uid, nickname]);

  useEffect(() => {
    const fetchComments = async () => {
      const postRef = doc(db, "posts", id);
      const docSnap = await getDoc(postRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommentList(data.comments || []);
      }
    };

    fetchComments();
  }, [id]);

  const handleLike = async () => {
    const postRef = doc(db, "posts", id);
    if (hasLiked) {
      await updateDoc(postRef, {
        likeCount: increment(-1),
        likedBy: arrayRemove(user?.uid),
      });
      setLikes(likes - 1);
    } else {
      await updateDoc(postRef, {
        likeCount: increment(1),
        likedBy: arrayUnion(user?.uid),
      });
      setLikes(likes + 1);
    }
    setHasLiked(!hasLiked);
  };

  const onDeletePost = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      if (photoUrls && photoUrls.length > 0) {
        for (const filename of photoUrls) {
          try {
            await fetch("http://uploadloop.kro.kr:4000/delete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ url: `/postphoto/${filename}` }),
            });
          } catch (error) {
            console.error("서버 이미지 삭제 실패:", error);
          }
        }
      }
      await deleteDoc(doc(db, "posts", id));
      alert("게시물이 삭제되었습니다.");
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  return (
    <Container>
      <Wrapper>
        <ProfileImg
          src={currentPhotoUrl || defaultProfileImg}
          alt="Profile"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = defaultProfileImg;
          }}
        />
        <UserInfo>
          <UserName>{currentNickname}</UserName>
          <UserMeta>
            <span>{user?.uid === userId ? user.email : ""}</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </UserMeta>
        </UserInfo>
        {user?.uid === userId && (
          <div style={{ display: "flex", gap: "5px", marginLeft: "auto" }}>
            <EditBtn onClick={() => setIsEditing(!isEditing)}>수정</EditBtn>
            <DeleteBtn onClick={onDeletePost}>삭제</DeleteBtn>
          </div>
        )}
      </Wrapper>
      <EditableContent>
        {isEditing ? (
          <>
            <textarea
              value={editedPost}
              onChange={(e) => setEditedPost(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                resize: "vertical",
              }}
            />
            <SaveBtn
              onClick={async () => {
                try {
                  await updateDoc(doc(db, "posts", id), { post: editedPost });
                  setIsEditing(false);
                } catch (err) {
                  console.error("게시글 수정 오류:", err);
                }
              }}
            >
              저장
            </SaveBtn>
          </>
        ) : (
          <Content>{post}</Content>
        )}
      </EditableContent>
      {photoUrls.length > 0 && (
        <ImageGallery>
          {photoUrls.map((url, index) => (
            <Image
              key={index}
              src={`http://uploadloop.kro.kr:4000/postphoto/${url}`}
              alt={`Post image ${index + 1}`}
            />
          ))}
        </ImageGallery>
      )}
      <Actions>
        <LikeBtn onClick={handleLike}>
          <img
            src={hasLiked ? "/heart3.png" : "/heart.png"}
            alt="Like"
            width="15"
          />
          <span>{likes}</span>
        </LikeBtn>
        <CommentBtn onClick={() => setShowComments(!showComments)}>
          <img src="/comment.png" alt="Comment" width="15" height="15" />
          <span style={{ marginLeft: "4px" }}>{commentList.length}</span>
        </CommentBtn>
      </Actions>

      {showComments && (
        <CommentSection
          postId={id}
          initialComments={commentList}
          initialCount={commentList.length}
          onCommentAdded={async (newComment) => {
            const updatedComments = [...commentList, newComment];
            setCommentList(updatedComments);
            await updateDoc(doc(db, "posts", id), {
              comments: updatedComments,
            });
          }}
        />
      )}
    </Container>
  );
};

export default Post;

// 스타일 생략 or 아래처럼 간단한 예시
const Container = styled.div`
  border: 1px solid #444;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: #222;
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProfileImg = styled.img`
  border-radius: 50%;
  width: 40px;
  height: 40px;
  margin-right: 0.5rem;
`;

const UserInfo = styled.div`
  color: #ccc;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const UserName = styled.div`
  font-weight: bold;
  font-size: 16px;
  color: #fff;
`;

const UserMeta = styled.div`
  font-size: 12px;
  color: #aaa;
  display: flex;
  flex-direction: column;
  gap: 5px;
  opacity: 0.5;
`;

const EditableContent = styled.div`
  color: #eee;
  margin-bottom: 0.5rem;
`;

const Content = styled.div`
  margin-bottom: 0.5rem;
`;

const ImageGallery = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Image = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  margin: 1rem 0 0.5rem 0;
`;

const LikeBtn = styled.button`
  background: none;
  border: none;
  color: orange;
  cursor: pointer;
`;

const CommentBtn = styled.button`
  background: none;
  border: none;
  color: green;
  cursor: pointer;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: red;
  cursor: pointer;
`;

const EditBtn = styled.button`
  background: none;
  border: none;
  color: blue;
  cursor: pointer;
`;

const SaveBtn = styled.button`
  background: none;
  border: 1px solid #ccc;
  color: white;
  cursor: pointer;
  margin-top: 0.5rem;
  padding: 4px 10px;
  border-radius: 4px;
`;
