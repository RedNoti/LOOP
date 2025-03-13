import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const Button = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: #19315d;
  padding: 5px 30px;
  border-radius: 15px;
  font-weight: 600;
  cursor: pointer;
`;
const Title = styled.p``;
const Icon = styled.img`
  background-color: white;
  width: 12px;
  height: 12px;
`;

export default () => {
  // navigate Hook
  const navigation = useNavigate();

  // 회원가입 페이지로 이동하는 함수
  const onClick = () => {
    navigation("/signup");
  };

  return (
    <Button onClick={onClick}>
      <Icon src={`${process.env.PUBLIC_URL}/email-icon.png`} />
      <Title>이메일로 가입하기</Title>
    </Button>
  );
};
