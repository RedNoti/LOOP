// home.tsx
import styled from "styled-components";
import Timeline from "../components/Timeline";
import YouTubeMusicPlayer from "./music";

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin-left: 5px;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  > div {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
`;

const MusicPlayerWrapper = styled.div`
  width: 50%;
  min-width: 320px;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  background-color: rgb(13, 15, 18);
  border-radius: 15px;
  display: flex;
  flex-direction: column;

  > div {
    overflow-y: auto;
    flex: 1;
    min-height: 0;

    /* ✅ 스크롤바 투명 처리 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: transparent;
    }
    &:hover::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
    }
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
    border-radius: 0;
  }
`;

export default () => {
  return (
    <Container>
      <ContentArea>
        <div>
          <Timeline />
        </div>
      </ContentArea>
      <MusicPlayerWrapper>
        <div>
          <YouTubeMusicPlayer />
        </div>
      </MusicPlayerWrapper>
    </Container>
  );
};
