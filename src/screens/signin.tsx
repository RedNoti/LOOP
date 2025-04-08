// 📄 Signin 화면 - 이메일 및 비밀번호 기반 로그인 기능을 제공합니다.
import { signInWithEmailAndPassword } from "firebase/auth";  // 🔑 이메일 로그인 처리
import { useState } from "react";
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import { FirebaseError } from "firebase/app";
import { useNavigate } from "react-router-dom";
import EmailSignUpButton from "../components/EmailSignUpButton";
import GoogleSignUpButton from "../components/GoogleSignUpButton";

const Container = styled.div`  // 🎨 styled-components 스타일 정의
  background-color: rgb(0, 0, 0, 0.5);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: center;
  justify-items: center;
  width: 100%;
  padding: 30px;
  @media (max-width: 500px) {
    display: flex;
    flex-direction: column;
  }
`;

const Title = styled.h1`  // 🎨 styled-components 스타일 정의
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 20px;
`;

const LogoImg = styled.img`  // 🎨 styled-components 스타일 정의
  width: 100%;
  max-width: 350px;
  height: auto;
`;

const Form = styled.form`  // 🎨 styled-components 스타일 정의
  margin-top: 30px;
  gap: 10px;
  display: flex;
  flex-direction: column;
`;

const Input = styled.input`  // 🎨 styled-components 스타일 정의
  border-radius: 5px;
  border: none;
  padding: 5px 20px;
  &::placeholder {
    font-size: 10px;
  }
  &[type="submit"] {
    cursor: pointer;
    margin-top: 20px;
  }
`;

const SubTitle = styled.p`  // 🎨 styled-components 스타일 정의
  font-size: 9px;
`;

const SigninBtn = styled.div`  // 🎨 styled-components 스타일 정의
  padding: 10px 20px;
  border-radius: 20px;
  background-color: #19315d;
  font-size: 10px;
  font-weight: 600;
  color: white;
  display: flex;
  justify-content: center;
  cursor: pointer;
  margin-top: 20px;
`;

const ErrorMsg = styled.div`  // 🎨 styled-components 스타일 정의
  display: flex;
  justify-content: center;
  margin: 5px 0px;
  color: tomato;
  font-size: 11px;
  font-weight: bold;
`;

const Guide = styled.span`  // 🎨 styled-components 스타일 정의
  font-size: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 7px;
  a {
    color: #389ef8;
    margin-left: 5px;
  }
`;

const Divider = styled.p`  // 🎨 styled-components 스타일 정의
  display: flex;
  align-items: center;
  font-size: 10px;
  color: #d1d1d1;
  margin: 12px 0px;
  &::before,
  &::after {
    content: "";
    border-bottom: 1px solid #d1d1d1;
    flex: 1;
    margin: 0px 5px;
  }
`;

const YoutubeBackground = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: -1,
      overflow: "hidden",
      pointerEvents: "none",
    }}
  >
    <video
      src="https://sonacstudio.kro.kr/loop_login/login.mp4"
      autoPlay
      loop
      muted
      playsInline
      style={{
        width: "100vw",
        height: "100vh",
        objectFit: "cover",
      }}
    />
  </div>
);

export default () => {
  const navi = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { name, value },
    } = event;
    switch (name) {
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        break;
    }
  };

  const onSubmit = async () => {
    if (loading) return;
    if (email === "" || password === "") {
      alert("회원 정보를 모두 입력해주세요");
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);  // 🔑 이메일 로그인 처리
      navi("/");
    } catch (error) {
      if (error instanceof FirebaseError) {
        setError(error.code);
      }
    } finally {
      setLoading(false);
    }
  };

  return (  // 🔚 컴포넌트의 JSX 반환 시작
    <>
      <YoutubeBackground />
      <Container>
        <LogoImg src={`${process.env.PUBLIC_URL}/LOOP_LOGO.png`} />
        <Form>
          <Title>음악으로 소통하는 공간</Title>
          <SubTitle>이메일*</SubTitle>
          <Input
            name="email"
            onChange={onChange}
            type="email"
            placeholder="예) Daelim@daelim.ac.kr"
            value={email}
          />
          <SubTitle>비밀번호*</SubTitle>
          <Input
            name="password"
            onChange={onChange}
            type="password"
            placeholder="예) 6자리 이상 입력하세요"
            value={password}
          />
          <SigninBtn onClick={loading ? undefined : onSubmit}>
            {loading ? "로딩 중..." : "로그인"}
          </SigninBtn>
          {error !== "" && <ErrorMsg>{errorMsgGroup[error]}</ErrorMsg>}
          <Divider>또는</Divider>
          <Guide>
            <EmailSignUpButton />
            <GoogleSignUpButton showPlaylists={false} />
          </Guide>
        </Form>
      </Container>
    </>
  );
};

interface errorMsgGroupType {
  [key: string]: string;
}

const errorMsgGroup: errorMsgGroupType = {
  "auth/email-already-in-use": "이미 존재하는 계정입니다.",
  "auth/weak-password": "비밀번호를 6자리 이상 입력해주세요",
  "auth/invalid-email": "잘못된 이메일 혹은 비밀번호입니다.",
  "auth/invalid-credential": "잘못된 회원 정보입니다.",
};