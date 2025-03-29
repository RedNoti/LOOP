// home.tsx
import styled from "styled-components";
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
    overflow-y: auto;
    min-height: 0;
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
    </Container>
  );
};
