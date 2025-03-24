// layout.tsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";

const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const Header = styled.div`
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-left: 20px;
  background-color: black;
`;

const Logo = styled.img`
  width: clamp(100px, 12vw, 150px);
  height: auto;
  object-fit: contain;
`;

const Body = styled.div`
  height: calc(100vh - 70px); // Header 높이 만큼 빼줌
  display: flex;
  overflow: hidden;
`;

const Navigator = styled.div`
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background-color: rgb(39, 39, 39);
  border-radius: 0 15px 15px 0;
  padding-top: 20px;
  padding-bottom: 16px; // ✅ 하단 여백 추가
  overflow-y: overlay;
  min-height: 0;
  flex-shrink: 0;
`;

const MenuItem = styled.div`
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    width: 30px; // ✅ 아이콘 내부는 더 작게
    height: 30px;
  }
`;

const BottomMenu = styled.div`
  margin-top: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MainContent = styled.div`
  flex: 1;
  overflow: hidden;
`;

export default () => {
  const navi = useNavigate();

  const signOut = async () => {
    const isOK = window.confirm("정말로 로그아웃 하실 건가요?");
    if (isOK) {
      await auth.signOut();
      navi("/signin");
    }
  };

  return (
    <LayoutWrapper>
      <Header>
        <Logo src="/uplogo.png" alt="uplogo" />
      </Header>
      <Body>
        <Navigator>
          <Link to="/">
            <MenuItem>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"
                />
              </svg>
            </MenuItem>
          </Link>

          <Link to="/InputPostScreen">
            <MenuItem>
              <svg
                className="w-6 h-6 text-gray-800 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                color="white"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 12h14m-7 7V5"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                />
              </svg>
            </MenuItem>
          </Link>

          <Link to="/profile">
            <MenuItem>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                />
              </svg>
            </MenuItem>
          </Link>

          <BottomMenu>
            <MenuItem onClick={signOut}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 12H8m10 0-4 4m4-4-4-4M15 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10"
                />
              </svg>
            </MenuItem>
          </BottomMenu>
        </Navigator>

        <MainContent>
          <Outlet />
        </MainContent>
      </Body>
    </LayoutWrapper>
  );
};
