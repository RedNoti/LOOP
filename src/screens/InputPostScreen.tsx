// src/screens/InputPostScreen.tsx
import styled from "styled-components";
import InputPost from "../components/InputPost";

const Wrapper = styled.div`
  padding: 20px 15px;
  background-color: rgb(32, 32, 32);
  border-radius: 15px;
  margin-bottom: 16px;
`;

export default function InputPostScreen() {
  return (
    <Wrapper>
      <InputPost />
    </Wrapper>
  );
}
