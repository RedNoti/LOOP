// src/screens/InputPostScreen.tsx
import styled from "styled-components";
import InputPost from "../components/InputPost";

const Wrapper = styled.div`
  padding: 20px 15px;
  border-radius: 8px;
  margin-bottom: 16px;
  margin-left: 5px;
  margin-right: 5px;
`;

export default function InputPostScreen() {
  return (
    <Wrapper>
      <InputPost />
    </Wrapper>
  );
}
