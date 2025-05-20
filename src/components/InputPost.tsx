import { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import {
  useMusic,
  fetchPlaylistVideosReturn,
} from "../components/MusicFunction";
import { addDoc, collection, getDoc, doc } from "firebase/firestore";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import React from "react";

const Container = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
`;

const Form = styled.form`
  display: flex;
  gap: 10px;
  padding: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
  border-radius: 8px;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ProfileArea = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 30px;
  background-color: tomato;
  overflow: hidden;
`;

const PostArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: auto;
`;

const TextArea = styled.textarea`
  resize: none;
  background-color: black;
  color: white;
  width: 100%;
  font-weight: bold;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  border: none;
  border-radius: 5px;
  &:focus {
    outline-color: #118bf0;
  }
`;

const BottomMenu = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  margin-top: 15px;
  border-radius: 30px;
  flex-wrap: wrap;
`;

const IconButtonBox = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #19315d;
  border-radius: 5px;
`;

const AttachPhotoButton = styled.label`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
`;

const AttachPhotoInput = styled.input`
  display: none;
`;

const SubmitButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
`;

const ImagePreviewWrapper = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
`;

const ImagePreview = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const ImageCountBadge = styled.div`
  position: absolute;
  top: 5px;
  left: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
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

const AttachPlaylistButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.12);
  }
  &:active {
    transform: scale(1.2);
  }
`;

interface Playlist {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

export default () => {
  const navigate = useNavigate(); // ✅ 페이지 이동 훅
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [post, setPost] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const { currentPlaylistId, playlists, videos } = useMusic();
  const [attachPlaylist, setAttachPlaylist] = useState(false);
  const [attachedPlaylist, setAttachedPlaylist] = useState<Playlist | null>(
    null
  );

  useEffect(() => {
    const loadProfilePhoto = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let photoUrl = user.photoURL || "";
      try {
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        if (profileDoc.exists() && profileDoc.data().photoUrl) {
          photoUrl = profileDoc.data().photoUrl;
        }
      } catch (err) {
        console.error("프로필 사진 로드 실패:", err);
      }
      setProfilePhotoUrl(photoUrl);
    };
    loadProfilePhoto();
  }, []);

  useEffect(() => {
    console.log("현재 재생목록 ID:", currentPlaylistId);
    console.log("재생목록 목록:", playlists);
    console.log("현재 비디오:", videos);
  }, [currentPlaylistId, playlists, videos]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPost(value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  };

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).slice(0, 5 - files.length);
      const newPreviews: string[] = [];
      const newFilesToAdd: File[] = [];

      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          newFilesToAdd.push(file);

          if (newPreviews.length === newFiles.length) {
            setFiles((prev) => [...prev, ...newFilesToAdd]);
            setPreviews((prev) => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setPreviews((prev) => prev.filter((_, index) => index !== indexToRemove));
    if (textAreaRef.current) textAreaRef.current.value = "";
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (post.trim() === "" && files.length === 0) {
      alert("게시물 내용이나 이미지를 입력해주세요.");
      return;
    }

    if (loading) return;
    setLoading(true);

    let playlistFileUrl = null;
    let playlistInfo = null;

    if (attachPlaylist && currentPlaylistId) {
      console.log("재생목록 첨부 시작:", currentPlaylistId);
      let playlist = attachedPlaylist;
      if (playlist) {
        console.log("재생목록 찾음:", playlist);
        try {
          const playlistTracks = await fetchPlaylistVideosReturn(playlist.id);
          console.log("재생목록 트랙 가져옴:", playlistTracks.length);

          playlistInfo = {
            id: playlist.id,
            title: playlist.snippet.title,
            thumbnail:
              playlist.snippet.thumbnails.high?.url ||
              playlist.snippet.thumbnails.medium?.url ||
              playlist.snippet.thumbnails.default?.url,
            tracks: playlistTracks.map((video: any) => ({
              videoId: video.snippet.resourceId.videoId,
              title: video.snippet.title,
              thumbnail:
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url ||
                video.snippet.thumbnails.default?.url,
            })),
          };

          console.log("재생목록 정보 생성됨:", playlistInfo);

          // 재생목록 정보를 JSON 파일로 저장
          const blob = new Blob([JSON.stringify(playlistInfo)], {
            type: "application/json",
          });
          const formData = new FormData();
          formData.append("file", blob, "playlist.json");

          const response = await axios.post(
            "http://uploadloop.kro.kr:4000/postplaylist",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
          console.log("재생목록 업로드 성공:", response.data);
          playlistFileUrl = response.data.filename;
        } catch (err) {
          console.error("재생목록 처리 중 오류:", err);
          alert("재생목록 첨부에 실패했습니다.");
        }
      } else {
        console.error("재생목록을 찾을 수 없음:", currentPlaylistId);
        alert("현재 재생 중인 재생목록을 찾을 수 없습니다.");
      }
    }

    let photoUrls: string[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post(
          "http://uploadloop.kro.kr:4000/postphoto",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        photoUrls.push(response.data.filename);
      }

      let profileName = user.displayName || "";
      let profilePhoto = user.photoURL || "";

      try {
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          if (profileData.name) profileName = profileData.name;
          if (profileData.photoUrl) profilePhoto = profileData.photoUrl;
        }
      } catch (err) {
        console.error("프로필 정보 가져오기 실패:", err);
      }

      const myPost = {
        nickname: profileName,
        userId: user.uid,
        email: user.email,
        createdAt: Date.now(),
        post: post,
        photoUrls: photoUrls,
        photoUrl: profilePhoto,
        likeCount: 0,
        commentCount: 0,
        likedBy: [],
        playlist: playlistInfo,
        playlistFileUrl: playlistFileUrl,
      };

      await addDoc(collection(db, "posts"), myPost);

      // 상태 초기화
      setPost("");
      setFiles([]);
      setPreviews([]);
      setAttachPlaylist(false);
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.value = "";
      }

      // 타임라인으로 이동
      navigate("/");
    } catch (e) {
      console.error("게시물 작성 중 오류:", e);
      alert("게시물 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Form onSubmit={onSubmit}>
        <ProfileArea>
          {profilePhotoUrl && (
            <ProfileImage src={profilePhotoUrl} alt="프로필 사진" />
          )}
        </ProfileArea>
        <PostArea>
          <TextArea
            ref={textAreaRef}
            rows={4}
            value={post}
            onChange={onChange}
            placeholder="무슨 일이 일어났나요?"
          />
          {previews.length > 0 && (
            <ImagePreviewContainer>
              {previews.map((preview, index) => (
                <ImagePreviewWrapper key={index}>
                  <ImagePreview src={preview} alt={`preview ${index}`} />
                  <RemoveImageButton
                    type="button"
                    onClick={() => removeImage(index)}
                  >
                    X
                  </RemoveImageButton>
                  <ImageCountBadge>
                    {index + 1} / {previews.length}
                  </ImageCountBadge>
                </ImagePreviewWrapper>
              ))}
            </ImagePreviewContainer>
          )}
          <BottomMenu>
            <AttachPhotoButton htmlFor="photo">
              <IconButtonBox>
                <img
                  src="/icon/upload_icon.svg"
                  alt="사진 업로드"
                  width={18}
                  height={18}
                />
              </IconButtonBox>
            </AttachPhotoButton>
            <AttachPhotoInput
              ref={fileInputRef}
              onChange={onChangeFile}
              id="photo"
              type="file"
              accept="image/*"
              multiple
              disabled={previews.length >= 5}
            />
            <AttachPlaylistButton
              type="button"
              onClick={() => {
                let currentPlaylist = playlists.find(
                  (p: Playlist) => p.id === currentPlaylistId
                );
                if (
                  !currentPlaylist &&
                  videos.length > 0 &&
                  currentPlaylistId
                ) {
                  currentPlaylist = {
                    id: currentPlaylistId,
                    snippet: {
                      title:
                        videos[0].snippet.playlistTitle ||
                        videos[0].snippet.title ||
                        "재생목록",
                      thumbnails: {
                        high: {
                          url: videos[0].snippet.thumbnails?.high?.url || "",
                        },
                        medium: {
                          url: videos[0].snippet.thumbnails?.medium?.url || "",
                        },
                        default: {
                          url: videos[0].snippet.thumbnails?.default?.url || "",
                        },
                      },
                    },
                  };
                }
                if (!currentPlaylist) {
                  alert("현재 재생 중인 재생목록을 찾을 수 없습니다.");
                  return;
                }
                setAttachPlaylist(!attachPlaylist);
                setAttachedPlaylist(currentPlaylist);
              }}
              style={{
                backgroundColor: attachPlaylist ? "#118bf0" : "transparent",
              }}
            >
              <IconButtonBox
                style={{ background: attachPlaylist ? "#118bf0" : "#19315d" }}
              >
                <img
                  src="/icon/music_Icon2.svg"
                  alt="재생목록 첨부"
                  width={18}
                  height={18}
                />
              </IconButtonBox>
            </AttachPlaylistButton>
            <SubmitButton type="submit" disabled={loading}>
              <IconButtonBox>
                <img
                  src="/icon/upload_post.svg"
                  alt="제출"
                  width={18}
                  height={18}
                />
              </IconButtonBox>
            </SubmitButton>
          </BottomMenu>
          {attachPlaylist && attachedPlaylist && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#2a2a2a",
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              <img
                src={
                  attachedPlaylist.snippet.thumbnails.high?.url ||
                  attachedPlaylist.snippet.thumbnails.medium?.url ||
                  attachedPlaylist.snippet.thumbnails.default?.url
                }
                alt="playlist"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  objectFit: "cover",
                  marginRight: 8,
                }}
              />
              <span style={{ color: "#fff", fontWeight: "bold" }}>
                {attachedPlaylist.snippet.title}
              </span>
            </div>
          )}
        </PostArea>
      </Form>
    </Container>
  );
};
