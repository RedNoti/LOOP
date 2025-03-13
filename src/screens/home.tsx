// home page를 구성
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import InputPost from "../components/InputPost";
import Timeline from "../components/Timeline";

const Container = styled.div``;
const Title = styled.h1``;

export default () => {
  return (
    <Container>
      <InputPost />
      <Timeline />
    </Container>
  );
};
