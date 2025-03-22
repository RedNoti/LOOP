import styled from "styled-components";
import { auth } from "../firebaseConfig";
import InputPost from "../components/InputPost";
import Timeline from "../components/Timeline";
import YouTubeMusicPlayer from "./music";

const Container = styled.div`
  display: flex;
  align-items: flex-start;
`;

const MusicPlayerWrapper = styled.div`
  width: 320px;
  height: 100dvh;
  background-color: #111827;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;

  @media (max-height: 600px) {
    height: 100vh;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 2rem;
`;

export default () => {
  return (
    <Container>
      <ContentArea>
        <InputPost />
        <Timeline />
      </ContentArea>
      <MusicPlayerWrapper>
        <YouTubeMusicPlayer />
      </MusicPlayerWrapper>
    </Container>
  );
};
