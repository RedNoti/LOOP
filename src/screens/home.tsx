import styled from "styled-components";
import { auth } from "../firebaseConfig";
import InputPost from "../components/InputPost";
import Timeline from "../components/Timeline";
import YouTubeMusicPlayer from "./music";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  gap: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  height: 100%;
  width: 100%; /* 추가해보면 좋음 */
`;

const MusicPlayerWrapper = styled.div`
  width: 30%;
  max-width: 400px;
  min-width: 300px;
  height: 100%;
  background-color: #111827;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
  }
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
