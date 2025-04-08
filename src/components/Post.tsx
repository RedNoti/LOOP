// 📄 Post 컴포넌트 - 게시글의 본문, 이미지, 댓글, 좋아요 기능 등을 렌더링합니다.
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
import CommentSection from "./Comment";
import { useMusicPlayer } from "./MusicFunction"; // ✅ 추가

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
  playlist?: {
    id: string;
    title: string;
    thumbnail: string;
  } | null;
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
  playlist,
}: PostProps) => {
  const [commentList, setCommentList] = useState(comments || []);  // 💡 상태(State) 정의
  const user = auth.currentUser;  // 🔐 현재 로그인된 사용자 정보 참조
  const [likes, setLikes] = useState(0);  // 💡 상태(State) 정의
  const [hasLiked, setHasLiked] = useState(false);  // 💡 상태(State) 정의
  const [showComments, setShowComments] = useState(false);  // 💡 상태(State) 정의
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(
    photoUrl
  );
  const [currentNickname, setCurrentNickname] = useState<string | undefined>(
    nickname
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);  // 💡 상태(State) 정의
  const [editedPost, setEditedPost] = useState(post);  // 💡 상태(State) 정의
  const { playPlaylist } = useMusicPlayer(); // ✅ 재생 함수

  useEffect(() => {  // 🔁 컴포넌트 마운트 시 실행되는 훅
    const fetchPost = async () => {
      const postRef = doc(db, "posts", id);  // 📄 Firestore 문서 참조
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

  useEffect(() => {  // 🔁 컴포넌트 마운트 시 실행되는 훅
    const fetchComments = async () => {
      const postRef = doc(db, "posts", id);  // 📄 Firestore 문서 참조
      const docSnap = await getDoc(postRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommentList(data.comments || []);
      }
    };

    fetchComments();
  }, [id]);

  const handleLike = async () => {
    const postRef = doc(db, "posts", id);  // 📄 Firestore 문서 참조
    if (hasLiked) {
      await updateDoc(postRef, {  // 📝 Firestore 문서 업데이트
        likeCount: increment(-1),
        likedBy: arrayRemove(user?.uid),  // ➖ 배열 필드에서 항목 제거
      });
      setLikes(likes - 1);
    } else {
      await updateDoc(postRef, {  // 📝 Firestore 문서 업데이트
        likeCount: increment(1),
        likedBy: arrayUnion(user?.uid),  // ➕ 배열 필드에 항목 추가
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
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: `/postphoto/${filename}` }),
            });
          } catch (error) {
            console.error("서버 이미지 삭제 실패:", error);
          }
        }
      }
      await deleteDoc(doc(db, "posts", id));  // 📄 Firestore 문서 참조
      alert("게시물이 삭제되었습니다.");
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  return (  // 🔚 컴포넌트의 JSX 반환 시작
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
                  await updateDoc(doc(db, "posts", id), { post: editedPost });  // 📄 Firestore 문서 참조
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

      {/* 첨부된 재생목록 렌더링 */}
      {playlist && (
        <PlaylistBox onClick={() => playPlaylist(playlist.id, 0, true)}>
          <PlaylistThumb src={playlist.thumbnail} alt="Playlist Thumbnail" />
          <PlaylistTitle>{playlist.title}</PlaylistTitle>
        </PlaylistBox>
      )}

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
            await updateDoc(doc(db, "posts", id), {  // 📄 Firestore 문서 참조
              comments: updatedComments,
            });
          }}
        />
      )}
    </Container>
  );
};

export default Post;

// 🎨 스타일 컴포넌트
const Container = styled.div`  // 🎨 styled-components 스타일 정의
  border: 1px solid #444;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: #222;
`;

const Wrapper = styled.div`  // 🎨 styled-components 스타일 정의
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProfileImg = styled.img`  // 🎨 styled-components 스타일 정의
  border-radius: 50%;
  width: 40px;
  height: 40px;
  margin-right: 0.5rem;
`;

const UserInfo = styled.div`  // 🎨 styled-components 스타일 정의
  color: #ccc;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const UserName = styled.div`  // 🎨 styled-components 스타일 정의
  font-weight: bold;
  font-size: 16px;
  color: #fff;
`;

const UserMeta = styled.div`  // 🎨 styled-components 스타일 정의
  font-size: 12px;
  color: #aaa;
  display: flex;
  flex-direction: column;
  gap: 5px;
  opacity: 0.5;
`;

const EditableContent = styled.div`  // 🎨 styled-components 스타일 정의
  color: #eee;
  margin-bottom: 0.5rem;
`;

const Content = styled.div`  // 🎨 styled-components 스타일 정의
  margin-bottom: 0.5rem;
`;

const ImageGallery = styled.div`  // 🎨 styled-components 스타일 정의
  display: flex;
  gap: 0.5rem;
`;

const Image = styled.img`  // 🎨 styled-components 스타일 정의
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
`;

const Actions = styled.div`  // 🎨 styled-components 스타일 정의
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  margin: 1rem 0 0.5rem 0;
`;

const LikeBtn = styled.button`  // 🎨 styled-components 스타일 정의
  background: none;
  border: none;
  color: orange;
  cursor: pointer;
`;

const CommentBtn = styled.button`  // 🎨 styled-components 스타일 정의
  background: none;
  border: none;
  color: green;
  cursor: pointer;
`;

const DeleteBtn = styled.button`  // 🎨 styled-components 스타일 정의
  background: none;
  border: none;
  color: red;
  cursor: pointer;
`;

const EditBtn = styled.button`  // 🎨 styled-components 스타일 정의
  background: none;
  border: none;
  color: blue;
  cursor: pointer;
`;

const SaveBtn = styled.button`  // 🎨 styled-components 스타일 정의
  background: none;
  border: 1px solid #ccc;
  color: white;
  cursor: pointer;
  margin-top: 0.5rem;
  padding: 4px 10px;
  border-radius: 4px;
`;

// ✅ 재생목록 박스 스타일
const PlaylistBox = styled.div`  // 🎨 styled-components 스타일 정의
  margin: 10px 0;
  padding: 10px;
  background: #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 12px;
`;

const PlaylistThumb = styled.img`  // 🎨 styled-components 스타일 정의
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
`;

const PlaylistTitle = styled.p`  // 🎨 styled-components 스타일 정의
  color: white;
  font-weight: bold;
  font-size: 14px;
`;