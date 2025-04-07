import { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { useMusicPlayer } from "./MusicFunction";
import { addDoc, collection, getDoc, doc } from "firebase/firestore";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
  justify-content: space-between;
  margin-top: 15px;
  border-radius: 30px;
`;

const AttachPhotoButton = styled.label`
  padding: 5px 20px;
  background-color: #19315d;
  color: white;
  border-radius: 30px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
`;

const AttachPhotoInput = styled.input`
  display: none;
`;

const SubmitButton = styled.input`
  padding: 5px 20px;
  border-radius: 30px;
  border: none;
  background-color: #19315d;
  color: white;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
  &:hover,
  ::after {
    opacity: 0.8;
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

export default () => {
  const navigate = useNavigate(); // ✅ 페이지 이동 훅
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [post, setPost] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const { currentPlaylistId, playlists, playPlaylist } = useMusicPlayer();
  const [attachPlaylist, setAttachPlaylist] = useState(false);

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

    try {
      const photoUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post(
          "http://uploadloop.kro.kr:4000/postphoto",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
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

      let playlistInfo = null;
      if (attachPlaylist && currentPlaylistId) {
        const playlist = playlists.find((p) => p.id === currentPlaylistId);
        if (playlist) {
          playlistInfo = {
            id: playlist.id,
            title: playlist.snippet.title,
            thumbnail: playlist.snippet.thumbnails.medium.url,
          };
        }
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
      };

      await addDoc(collection(db, "posts"), myPost);

      // 상태 초기화
      setPost("");
      setFiles([]);
      setPreviews([]);
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.value = "";
      }

      // ✅ 타임라인으로 이동
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
              {previews.length > 0
                ? `사진 추가됨 (${previews.length}/5)`
                : "사진 업로드"}
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
            <SubmitButton
              type="submit"
              value={loading ? "제출 중" : "제출하기"}
              disabled={loading}
            />
          </BottomMenu>
          <div style={{ marginTop: "10px" }}>
            <label style={{ color: "white", fontSize: "12px" }}>
              <input
                type="checkbox"
                checked={attachPlaylist}
                onChange={() => setAttachPlaylist(!attachPlaylist)}
                style={{ marginRight: "6px" }}
              />
              현재 재생목록 첨부
            </label>
            {attachPlaylist && currentPlaylistId && (
              <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src={
                    playlists.find((p) => p.id === currentPlaylistId)?.snippet?.thumbnails?.medium?.url
                  }
                  alt="playlist"
                  style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }}
                />
                <span style={{ color: "white", fontSize: "13px" }}>
                  {
                    playlists.find((p) => p.id === currentPlaylistId)?.snippet?.title
                  }
                </span>
              </div>
            )}
          </div>

        </PostArea>
      </Form>
    </Container>
  );
};
