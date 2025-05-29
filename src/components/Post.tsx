import { useState, useEffect, useRef } from "react";
import styled, { createGlobalStyle } from "styled-components";
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
import { useMusicPlayer } from "../components/MusicFunction";

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
    id?: string;
  }[];
  playlist?: {
    id: string;
    title: string;
    thumbnail: string;
    tracks?: {
      videoId: string;
      title: string;
      thumbnail: string;
    }[];
  } | null;
  playlistFileUrl?: string;
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
  playlistFileUrl,
}: PostProps) => {
  // 댓글 목록 상태
  const [commentList, setCommentList] = useState(comments || []);
  const user = auth.currentUser;
  // 좋아요 개수 및 내가 좋아요 눌렀는지 상태
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  // 댓글창 보이기 상태
  const [showComments, setShowComments] = useState(false);
  // 작성자 프로필 이미지, 닉네임
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(
    photoUrl
  );
  const [currentNickname, setCurrentNickname] = useState<string | undefined>(
    nickname
  );
  // 게시글 사진 url 배열 상태
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  // 게시글 수정 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);
  const { playPlaylist } = useMusicPlayer();
  const [fetchedPlaylist, setFetchedPlaylist] = useState<any>(null);

  // ▼ [사진 확대 관련 상태 및 참조값] ▼
  // 확대된 이미지를 저장 (url + 위치 정보)
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    rect: DOMRect;
  } | null>(null);
  // 이미지 DOM 참조 저장
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  // 확대 애니메이션 활성화 여부
  const [isZooming, setIsZooming] = useState(false);

  // 게시글 데이터 불러오기
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
        setPhotoUrls(
          (data.photoUrls || []).map((url: string) =>
            url.includes("http://")
              ? url
              : `http://loopmusic.kro.kr:4001/uploads/post_images/${url}`
          )
        );
      }
    };

    fetchPost();
  }, [id, user?.uid, nickname]);

  // 댓글 목록 불러오기
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

  // 플레이리스트 파일 불러오기
  useEffect(() => {
    const fetchPlaylistFile = async () => {
      if (playlistFileUrl) {
        try {
          const playlistRes = await fetch(
            playlistFileUrl.replace("4000", "4001")
          );
          const data = await playlistRes.json();
          setFetchedPlaylist(data);
        } catch (err) {
          console.error("재생목록 JSON 불러오기 실패:", err);
        }
      }
    };
    fetchPlaylistFile();
  }, [playlistFileUrl]);

  // 좋아요 버튼 핸들러
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

  // 게시글 삭제 버튼 핸들러
  const onDeletePost = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      if (photoUrls && photoUrls.length > 0) {
        for (const url of photoUrls) {
          try {
            const filename = url.split("/").pop();
            await fetch("http://loopmusic.kro.kr:4001/delete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ filename }),
            });
          } catch (error) {
            console.error("서버 이미지 삭제 실패:", error);
          }
        }
      }
      if (playlistFileUrl) {
        try {
          const filename = playlistFileUrl.split("/").pop();
          await fetch("http://loopmusic.kro.kr:4001/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ filename }),
          });
        } catch (error) {
          console.error("서버 JSON 파일 삭제 실패:", error);
        }
      }
      await deleteDoc(doc(db, "posts", id));
      alert("게시물이 삭제되었습니다.");
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  // ▼ 사진 클릭 시: 사진의 위치/크기 정보를 읽어와서 확대 상태로 변경하는 함수 ▼
  const handleImageClick = (url: string, index: number) => {
    const rect = imgRefs.current[index]?.getBoundingClientRect();
    if (rect) {
      setZoomedImage({ url, rect }); // 확대할 이미지 및 시작 위치 저장
      setTimeout(() => setIsZooming(true), 10); // 다음 tick에 확대 transition 시작
    }
  };

  // ▼ 확대 상태의 사진을 닫을 때 호출되는 함수 (축소 애니메이션 후 상태 해제) ▼
  const handleZoomClose = () => {
    setIsZooming(false); // 축소 transition 시작
    setTimeout(() => setZoomedImage(null), 400); // 0.4초 후 확대모달 제거
  };

  return (
    <Container>
      {/* 글로벌 확대/축소 CSS 스타일 추가 */}
      <ZoomStyle />
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
        {/* 본인 게시글이면 수정/삭제 버튼 */}
        {user?.uid === userId && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              display: "flex",
              gap: "10px",
              zIndex: 10,
            }}
          >
            <EditBtn onClick={() => setIsEditing(!isEditing)}>
              <img
                src="/icon/pencil_icon.svg"
                alt="수정"
                width={20}
                height={20}
                style={{ color: "#FFFFFF", fill: "#FFFFFF" }}
              />
            </EditBtn>
            <DeleteBtn onClick={onDeletePost}>
              <img
                src="/icon/Delete_Icon.svg"
                alt="삭제"
                width={20}
                height={20}
                style={{ color: "#FFFFFF", fill: "#FFFFFF" }}
              />
            </DeleteBtn>
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

      {/* ▼ 게시글 이미지 목록 (여러장 지원) ▼ */}
      {photoUrls.length > 0 && (
        <ImageGallery>
          {photoUrls.map((url, index) => (
            <Image
              key={index}
              src={url}
              alt={`Post image ${index + 1}`}
              ref={(el) => (imgRefs.current[index] = el)} // 각 이미지의 DOM 참조 저장
              onClick={() => handleImageClick(url, index)} // 클릭 시 확대 함수 호출
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/image_error.png";
              }}
            />
          ))}
        </ImageGallery>
      )}

      {/* ▼ 사진 확대 모달 (오버레이, 닫기 버튼, 확대/축소 애니메이션 모두 담당) ▼ */}
      {zoomedImage && (
        <div
          className={`zoom-overlay${isZooming ? " active" : ""}`}
          onClick={handleZoomClose} // 오버레이 클릭 시 닫힘
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: isZooming ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0)",
            transition: "background 0.4s",
            cursor: "zoom-out",
            overflow: "hidden",
          }}
        >
          {/* X 닫기 버튼 - 우상단 고정, 클릭시 사진 축소 후 모달 닫힘 */}
          <button
            className="zoom-close-btn"
            onClick={(e) => {
              e.stopPropagation(); // 오버레이 닫힘 이벤트 막기
              handleZoomClose();
            }}
            aria-label="닫기"
          >
            ×
          </button>
          {/* 확대되는 이미지 */}
          <img
            src={zoomedImage.url}
            alt="Zoomed"
            className={`zoom-img${isZooming ? " active" : ""}`}
            style={{
              position: "fixed",
              left: zoomedImage.rect.left,
              top: zoomedImage.rect.top,
              width: zoomedImage.rect.width,
              height: zoomedImage.rect.height,
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
      )}

      {/* ▼ 좋아요, 댓글, 플레이리스트 버튼 등 기능 영역 ▼ */}
      <Actions>
        <LikeBtn onClick={handleLike}>
          <img
            src={hasLiked ? "/icon/like_Icon.svg" : "/icon/like_Icon.svg"}
            alt="Like"
            width="15"
            height="15"
          />
          <span>{likes}</span>
        </LikeBtn>
        <CommentBtn onClick={() => setShowComments(!showComments)}>
          <img src="/comment.png" alt="Comment" width="15" height="15" />
          <span>{commentList.length}</span>
        </CommentBtn>
        {playlistFileUrl && fetchedPlaylist && (
          <PlaylistBtn
            onClick={() => {
              if (fetchedPlaylist?.tracks?.length > 0) {
                const existingPlaylists = JSON.parse(
                  sessionStorage.getItem("playlists") || "[]"
                );
                const playlistExists = existingPlaylists.some(
                  (p: any) => p.id === fetchedPlaylist.id
                );
                if (!playlistExists) {
                  const newPlaylist = {
                    id: fetchedPlaylist.id,
                    snippet: {
                      title: fetchedPlaylist.title,
                      thumbnails: {
                        high: { url: fetchedPlaylist.thumbnail },
                        medium: { url: fetchedPlaylist.thumbnail },
                        default: { url: fetchedPlaylist.thumbnail },
                      },
                    },
                  };
                  existingPlaylists.push(newPlaylist);
                  sessionStorage.setItem(
                    "playlists",
                    JSON.stringify(existingPlaylists)
                  );
                }
                sessionStorage.setItem("currentPlaylistId", fetchedPlaylist.id);
                sessionStorage.setItem("currentVideoIndex", "0");
                window.dispatchEvent(
                  new CustomEvent("play_playlist_from_file", {
                    detail: {
                      videos: fetchedPlaylist.tracks.map((track: any) => ({
                        id: { videoId: track.videoId },
                        snippet: {
                          title: track.title,
                          thumbnails: {
                            default: { url: track.thumbnail },
                            medium: { url: track.thumbnail },
                            high: { url: track.thumbnail },
                          },
                          playlistId: fetchedPlaylist.id,
                        },
                      })),
                      playlistMeta: {
                        id: fetchedPlaylist.id,
                        title: fetchedPlaylist.title,
                        thumbnail: fetchedPlaylist.thumbnail,
                      },
                      existingPlaylists,
                    },
                  })
                );
              }
            }}
          >
            <PlaylistThumbSmall
              src={fetchedPlaylist?.thumbnail}
              alt="Playlist Thumbnail"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                objectFit: "cover",
                marginRight: "4px",
              }}
            />
            <span
              style={{
                maxWidth: "150px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "white",
              }}
            >
              {fetchedPlaylist?.title}
            </span>
          </PlaylistBtn>
        )}
      </Actions>

      {/* ▼ 댓글 입력/목록 영역 ▼ */}
      {showComments && (
        <CommentSectionWrapper>
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
            onCommentDeleted={async (deletedCommentId) => {
              const updatedComments = commentList.filter(
                (c) => c.id !== deletedCommentId
              );
              setCommentList(updatedComments);
              await updateDoc(doc(db, "posts", id), {
                comments: updatedComments,
              });
            }}
          />
        </CommentSectionWrapper>
      )}
    </Container>
  );
};

export default Post;

// ▼ 사진 확대/축소, 닫기버튼 스타일 전역 적용 (styled-components의 createGlobalStyle 활용)
const ZoomStyle = createGlobalStyle`
  /* 확대 애니메이션 active 시: 중앙으로 확대 + 그림자 */
  .zoom-img.active {
    left: 50% !important;
    top: 50% !important;
    width: 80vw !important;
    height: 80vh !important;
    transform: translate(-50%, -50%) !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45) !important;
  }
  /* 확대된 상태의 배경 오버레이 */
  .zoom-overlay.active {
    background: rgba(0,0,0,0.9) !important;
  }
  /* X 닫기 버튼 (오버레이 우측상단에 고정) */
  .zoom-close-btn {
    position: fixed;
    top: 32px;
    right: 48px;
    z-index: 1100;
    background: none;
    border: none;
    color: #fff;
    font-size: 3rem;
    cursor: pointer;
    padding: 0 10px;
    opacity: 0.7;
    transition: opacity 0.2s;
    line-height: 1;
  }
  .zoom-close-btn:hover {
    opacity: 1;
    color: #ff6262;
  }
`;

// ▼ 이하 styled-components 스타일 (변경 없음, 생략 가능)
const Container = styled.div`
  border: 1px solid #444;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: #222;
  position: relative;
  padding-bottom: 40px;
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const Image = styled.img`
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  margin: 1rem 0 0.5rem 0;
  position: absolute;
  bottom: 5px;
  left: 5px;
`;

const LikeBtn = styled.button`
  background: none;
  border: none;
  color: orange;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
`;

const CommentBtn = styled.button`
  background: none;
  border: none;
  color: green;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
`;

const EditBtn = styled.button`
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
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

const PlaylistBtn = styled.button`
  background: #2a2a2a;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 10px;
  transition: background-color 0.2s;

  &:hover {
    background: #333333;
  }
`;

const PlaylistThumbSmall = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: 4px;
`;

const CommentSectionWrapper = styled.div`
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  animation: expandSection 0.3s ease-out forwards;

  @keyframes expandSection {
    from {
      max-height: 0;
      opacity: 0;
    }
    to {
      max-height: 2000px;
      opacity: 1;
    }
  }
`;
