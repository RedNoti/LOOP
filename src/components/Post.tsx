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
  const { playPlaylist } = useMusicPlayer();
  const [fetchedPlaylist, setFetchedPlaylist] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
            await fetch("http://loopmusic.kro.kr:4001/delete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              body: JSON.stringify({ url: `/postphoto/${filename}` }),
            });
          } catch (error) {
            console.error("서버 이미지 삭제 실패:", error);
          }
        }
      }
      if (playlistFileUrl) {
        try {
          await fetch("http://loopmusic.kro.kr:4001/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ url: `/postplaylist/${playlistFileUrl}` }),
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

      {photoUrls.length > 0 && (
        <ImageGallery>
          {photoUrls.map((url, index) => (
            <Image
              key={index}
              src={url.replace("4000", "4001")}
              alt={`Post image ${index + 1}`}
              onClick={() => setSelectedImage(url.replace("4000", "4001"))}
            />
          ))}
        </ImageGallery>
      )}

      {selectedImage && (
        <ModalOverlay onClick={() => setSelectedImage(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={() => setSelectedImage(null)}>×</CloseButton>
            <ModalImage src={selectedImage} alt="Full size" />
          </ModalContent>
        </ModalOverlay>
      )}

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
                // 기존 재생목록 정보 가져오기
                const existingPlaylists = JSON.parse(
                  sessionStorage.getItem("playlists") || "[]"
                );

                // 새로운 재생목록이 기존 목록에 없는 경우에만 추가
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

                // 재생목록 정보 저장
                sessionStorage.setItem("currentPlaylistId", fetchedPlaylist.id);
                sessionStorage.setItem("currentVideoIndex", "0");

                // 재생 이벤트 발생
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

// 🎨 스타일 생략 없이 그대로 유지 (아래는 동일)
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  cursor: pointer;
`;

const ModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;
`;

const ModalImage = styled.img`
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
`;

const CloseButton = styled.button`
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
  padding: 5px;
  z-index: 1001;

  &:hover {
    color: #ccc;
  }
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
