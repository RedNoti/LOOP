import styled from "styled-components";
import { auth } from "../firebaseConfig";
import InputPost from "../components/InputPost";
import Timeline from "../components/Timeline";
import YouTubeMusicPlayer from "./music";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100dvh;
  overflow-x: hidden; // ✅ 좌우 스크롤 방지
  overflow-y: auto;
  gap: 0;
`;

const ContentArea = styled.div`
  flex: 1 1 auto;
  width: calc(100% - 50%); // ✅ 음악 플레이어를 제외한 공간 계산
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  @media (max-width: 768px) {
    width: 100%; // ✅ 모바일에서는 꽉 채우기
  }
`;

const MusicPlayerWrapper = styled.div`
  width: 50%;
  min-width: 300px;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;

  display: flex;
  flex-direction: column;

  background-color: #111827;
  border-radius: 30px; /* ✅ 여기만 30px로 변경 */

  > div {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
    border-radius: 0; /* ✅ 모바일에서는 둥근 모서리 제거 */
  }
`;

export default () => {
  return (
    <Container>
      <ContentArea>
        <div>
          <InputPost />
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
