import styled, { keyframes } from "styled-components";

const Container = styled.div`
  height: 100vh;
  background-color: #004cb7;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// animation : transition(시작-끝)/속도/+효과
const BounceAnim = keyframes`
    0%{transform: scale(1);}
    50%{transform: scale(1.5);}
    100%{transform: scale(1);}
`;
// dot
const Dot = styled.div`
  background-color: white;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0px 4px;
  animation: ${BounceAnim} 1s infinite ease-in-out;
  &:nth-child(1) {
    animation-delay: 0s;
  }
  &:nth-child(2) {
    animation-delay: 0.25s;
  }
  &:nth-child(3) {
    animation-delay: 0.5s;
  }
`;

export default () => {
  return (
    <Container>
      <Dot />
      <Dot />
      <Dot />
    </Container>
  );
};
