// 📄 Home 화면 - 타임라인을 보여주는 메인 피드입니다.
// home.tsx
import { useState } from "react";
import styled from "styled-components";
import PullToRefresh from "react-pull-to-refresh";
import Timeline from "../components/Timeline";

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
    /* ✅ 이 줄 삭제해서 중복 스크롤 제거 */
    /* overflow-y: auto; */
    min-height: 0;
    margin-right: 10px;
  }
`;

const Home = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    return new Promise<void>((resolve) => {
      setRefreshKey((prev) => prev + 1);
      resolve();
    });
  };

  return (
    <Container>
      <ContentArea>
        <PullToRefresh onRefresh={handleRefresh}>
          <div>
            <Timeline refreshKey={refreshKey} />
          </div>
        </PullToRefresh>
      </ContentArea>
    </Container>
  );
};

export default Home;
