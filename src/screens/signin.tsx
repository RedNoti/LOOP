// Signup page를 구성
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import { FirebaseError } from "firebase/app";
import { useNavigate } from "react-router-dom";
import EmailSignUpButton from "../components/EmailSignUpButton";
import GoogleSignUpButton from "../components/GoogleSignUpButton";

const Container = styled.div`
  background-color: #004cb7;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: center;
  justify-items: center;
  width: 100%;
  padding: 30px;
  /* 반응형 그리스 개수 변경 */
  @media (max-width: 500px) {
    display: flex;
    flex-direction: column;
  }
`;
const Title = styled.h1`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 20px;
`;
// 로고 이미지
const LogoImg = styled.img`
  width: 100%;
  max-width: 350px;
  height: auto;
`;

// Text 입력 필드 구역
const Form = styled.form`
  margin-top: 30px;
  gap: 10px;
  display: flex;
  flex-direction: column;
`;
// Text 입력칸
const Input = styled.input`
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
const SubTitle = styled.p`
  font-size: 9px;
`;
// 로그인 버튼 컴포넌트
const SigninBtn = styled.div`
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
const ErrorMsg = styled.div`
  display: flex;
  justify-content: center;
  margin: 5px 0px;
  color: tomato;
  font-size: 11px;
  font-weight: bold;
`;

// 로그인 페이지로 이동 안내
const Guide = styled.span`
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

// 구분자
const Divider = styled.p`
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

export default () => {
  // 회원가입을 위한 Process 작성
  // Hook 생성 : 페이지 이동을 위한
  const navi = useNavigate();

  // A.입력한 회원 정보를 저장(State)공간 -- useState Hook
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // B.입력한 회원 정보를 가공/수정한다.
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 2. 입력한 정보(입력값,입력위치)
    // const name = event.target.name; // 입력위치
    // const value = event.target.value;// 입력값
    const {
      target: { name, value },
    } = event;
    // 1. 입력한 정보를 분류(이메일,비번)
    // Goal : 각각 정보를 State(이메일,비번) 저장
    switch (name) {
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        break;
    }
  };
  // C.로그인버튼을 누른 경우, 입력한 회원정보를 SERVER에 전달 > 로그인처리한다.
  const onSubmit = async () => {
    console.log("로그인 버튼 눌림");
    // A. 방어코드 -- ex)입력을 안한 경우..
    if (loading) return;
    if (email === "" || password === "") {
      alert("회원 정보를 모두 입력해주세요");
    }
    // B. 로그인 프로세스 진행
    try {
      // b-1. 로딩 start
      setLoading(true);
      // b-2. 회원정보(닉네임,이메일,암호)를 모아서 서버(Firebase)에 전달(API)
      // 잠깐만 기다려..! 가입완료될 때까지만!
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // b-3. 서버에서.. 가입 진행..
      // b-4. 로그인완료 > 1.로그인화면 or 2.자동로그인>ho*me
      navi("/");
    } catch (error) {
      // C. 예외적인 경우(Error) .. 중복계정,잘못된정보
      // c-0. 만일 Firebase 관련 Error인 경우에만
      if (error instanceof FirebaseError) {
        // c-1. 에러메시지 출력
        setError(error.code);
      }
    } finally {
      // D. 로딩 exit..
      setLoading(false);
      // always 에러가 나든 안나든 실행
    }
  };
  // Page Design Rndering (화면 디자인)
  return (
    <Container>
      <LogoImg src={`${process.env.PUBLIC_URL}/Sonac_Title.png`} />
      <Form>
        <Title>새로운 컨텐츠를 만나보세요</Title>
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
          <GoogleSignUpButton />
        </Guide>
      </Form>
    </Container>
  );
};
// 1. 동일한 이메일
// 2. 비밀번호가 6자리 미만
// 3. 이메일,비번 잘못 입력
interface errorMsgGroupType {
  [key: string]: string;
}
const errorMsgGroup: errorMsgGroupType = {
  "auth/email-already-in-use": "이미 존재하는 계정입니다.",
  "auth/weak-password": "비밀번호를 6자리 이상 입력해주세요",
  "auth/invalid-email": "잘못된 이메일 혹은 비밀번호입니다.",
  "auth/invalid-credential": "잘못된 회원 정보입니다.",
};
