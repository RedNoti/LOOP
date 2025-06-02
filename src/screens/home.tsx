// 📄 Home 화면 - 타임라인을 보여주는 메인 피드입니다.
// home.tsx

import { useState } from "react";
import styled from "styled-components";

// @ts-ignore: 타입 오류 무시
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
    min-height: 0;
    margin-right: 10px;
  }
`;

// 🎨 회전 스피너
const Spinner = styled.div`
  border: 4px solid #e0e0e0; // 연회색 바탕
  border-top: 4px solid #999999; // 짙은 회색 → 회전 시 강조
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 0.7s linear infinite;
  margin: 10px auto;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// 🎨 Timeline 위에 표시될 로딩 박스
const TopLoadingBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
  color: #ffffff;
  font-weight: bold;
  font-size: 14px;
  margin: 10px auto;
  width: fit-content;
`;

const Home = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    return new Promise<void>((resolve) => {
      setIsRefreshing(true);
      setRefreshKey((prev) => prev + 1);
      setTimeout(() => {
        setIsRefreshing(false);
        resolve();
      }, 800);
    });
  };

  return (
    <Container>
      <ContentArea>
        <PullToRefresh
          onRefresh={handleRefresh}
          {...{
            pullDownContent: (
              <div
                style={{ textAlign: "center", padding: "10px", color: "#888" }}
              >
                ↓ 아래로 당겨서 새로고침
              </div>
            ),
            refreshingContent: <Spinner />,
          }}
        >
          <div>
            {/* 🟢 타임라인 상단에 로딩 표시 */}
            {isRefreshing && (
              <TopLoadingBox>
                <Spinner />
                새로고침 중
              </TopLoadingBox>
            )}

            <Timeline refreshKey={refreshKey} />
          </div>
        </PullToRefresh>
      </ContentArea>
    </Container>
  );
};

export default Home;
