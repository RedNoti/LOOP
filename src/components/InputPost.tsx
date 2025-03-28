import { useRef, useState } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { addDoc, collection } from "firebase/firestore";
import axios from "axios";

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
const ProfileArea = styled.div`
  background-color: tomato;
  width: 50px;
  height: 50px;
  border-radius: 30px;
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

export default () => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [post, setPost] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPost(value);
    if (textAreaRef && textAreaRef.current) {
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

    if (textAreaRef.current) {
      textAreaRef.current.value = "";
    }
  };

  const deleteUploadedImages = async (filenames: string[]) => {
    for (const filename of filenames) {
      try {
        await axios.post("http://uploadloop.kro.kr:4000/delete", {
          url: `http://uploadloop.kro.kr:4000/postphoto/${filename}`,
        });
      } catch (err) {
        console.error("이미지 삭제 실패:", err);
      }
    }
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
        formData.append("file", file); // ✅ multer에서 사용하는 키 이름

        const response = await axios.post(
          "http://uploadloop.kro.kr:4000/postphoto", // ✅ 수정된 경로
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        // ✅ 서버에서 filename 그대로 받음
        const filename = response.data.filename;
        photoUrls.push(filename);
      }

      const myPost = {
        nickname: user.displayName,
        userId: user.uid,
        email: user.email, // ✅ 이메일 추가!
        createdAt: Date.now(),
        post: post,
        photoUrls: photoUrls,
        photoUrl: user.photoURL || "",
        likeCount: 0,
        commentCount: 0,
        likedBy: [],
      };

      const path = collection(db, "posts");
      await addDoc(path, myPost);

      setPost("");
      setFiles([]);
      setPreviews([]);
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.value = "";
      }
    } catch (e) {
      console.error("게시물 작성 중 오류:", e);
      alert("게시물 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={onSubmit}>
      <ProfileArea></ProfileArea>
      <PostArea>
        <TextArea
          ref={textAreaRef}
          rows={4}
          value={post}
          onChange={onChange}
          placeholder="무슨 일이 일어났나요?"
        ></TextArea>
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
