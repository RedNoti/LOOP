// 필요한 React 및 외부 라이브러리 import
import { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { addDoc, collection, getDoc, doc } from "firebase/firestore";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// 스타일 컴포넌트 정의
const Form = styled.form`
  display: flex;
  gap: 10px;
  border: 1px solid #353535;
  padding: 20px 10px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
  border-radius: 30px;
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
  font-family: system-ui;
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

export default () => {
  const navigate = useNavigate(); // 페이지 이동을 위한 훅
  const textAreaRef = useRef<HTMLTextAreaElement>(null); // textarea 높이 조절용 참조
  const fileInputRef = useRef<HTMLInputElement>(null); // 파일 업로드 input 참조

  // 상태 변수들
  const [post, setPost] = useState<string>(""); // 작성 중인 글
  const [files, setFiles] = useState<File[]>([]); // 업로드할 이미지 파일들
  const [previews, setPreviews] = useState<string[]>([]); // 이미지 미리보기 URL들
  const [loading, setLoading] = useState<boolean>(false); // 제출 중 상태
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>(""); // 사용자 프로필 사진

  // 사용자 프로필 사진 불러오기
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

  // 글 내용 변경 시 처리
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPost(value);
    // textarea 높이 자동 조절
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  };

  // 이미지 업로드 시 처리
  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).slice(0, 5 - files.length); // 최대 5장 제한
      const newPreviews: string[] = [];
      const newFilesToAdd: File[] = [];

      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          newFilesToAdd.push(file);

          // 모든 이미지 처리 완료 시 상태 업데이트
          if (newPreviews.length === newFiles.length) {
            setFiles((prev) => [...prev, ...newFilesToAdd]);
            setPreviews((prev) => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // 이미지 미리보기에서 제거
  const removeImage = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setPreviews((prev) => prev.filter((_, index) => index !== indexToRemove));
    if (textAreaRef.current) textAreaRef.current.value = "";
  };

  // 폼 제출 처리
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

      // 이미지 서버에 업로드
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

      // 사용자 프로필 정보 가져오기
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

      // 게시물 객체 생성
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
      };

      // 게시물 Firestore에 저장
      await addDoc(collection(db, "posts"), myPost);

      // 입력 초기화
      setPost("");
      setFiles([]);
      setPreviews([]);
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

  // 실제 렌더링 부분
  return (
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
      </PostArea>
    </Form>
  );
};
