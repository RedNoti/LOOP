import { useRef, useState } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { addDoc, collection } from "firebase/firestore";

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

export default () => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [post, setPost] = useState<string>("");
  const [file, setFile] = useState<File>();
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
    const files = e.target.files;
    if (files && files.length === 1) {
      setFile(files[0]);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (user == null || post == "" || loading) {
        return;
      }
      const myPost = {
        nickname: user.displayName,
        userId: user.uid,
        createdAt: Date.now(),
        post: post,
      };
      const path = collection(db, "posts");
      await addDoc(path, myPost);

      // Clear the post content and reset the textarea height
      setPost("");
      if (textAreaRef && textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
      }

      // Optionally clear the file as well
      setFile(undefined);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={(e) => onSubmit(e)}>
      <ProfileArea></ProfileArea>
      <PostArea>
        <TextArea
          ref={textAreaRef}
          rows={4}
          value={post}
          onChange={(e) => onChange(e)}
          placeholder="무슨 일이 일어났나요?"
        ></TextArea>
        <BottomMenu>
          <AttachPhotoButton htmlFor="photo">
            {file ? "사진 추가됨" : "사진 업로드"}
          </AttachPhotoButton>
          <AttachPhotoInput
            onChange={(e) => onChangeFile(e)}
            id="photo"
            type="file"
            accept="image/*"
          />
          <SubmitButton
            type="submit"
            value={loading ? "제출 중" : "제출하기"}
          />
        </BottomMenu>
      </PostArea>
    </Form>
  );
};
