// 📄 Home 화면 - 타임라인을 보여주는 메인 피드입니다.
// home.tsx
import styled from "styled-components";
import Timeline from "../components/Timeline";

const Container = styled.div`  // 🎨 styled-components 스타일 정의
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin-left: 5px;
`;

const ContentArea = styled.div`  // 🎨 styled-components 스타일 정의
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  > div {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    margin-right: 10px;
  }
`;

export default () => {
  return (  // 🔚 컴포넌트의 JSX 반환 시작
    <Container>
      <ContentArea>
        <div>
          <Timeline />
        </div>
      </ContentArea>
    </Container>
  );
};