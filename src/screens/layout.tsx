import { Link, Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";

const Container = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 8px;
  width: 100vw;
  height: 100dvh;
  padding: 0; /* ✅ 패딩 제거 */
  box-sizing: border-box;

  @media (max-width: 768px) {
    grid-template-columns: 50px 1fr;
    padding: 0;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-grow: 1;
  height: 100%;
  overflow-y: auto; /* ✅ 내부 스크롤 */
  min-height: 0;
`;

const Navigator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 12px; /* ✅ 상단 여백 추가 */
`;

const MenuItem = styled.div`
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    width: 35px;
    height: 35px;
    fill: white;
  }
`;

const BottomMenu = styled.div`
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  flex: 1;
  margin-bottom: 12px; /* ✅ 하단 여백 추가 */
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
    <Container>
      <Navigator>
        {/* 홈화면 메뉴 */}
        <Link to={"/"}>
          <MenuItem>
            <svg
              className="w-6 h-6 text-gray-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z"
                clipRule="evenodd"
              />
            </svg>
          </MenuItem>
        </Link>

        {/* 프로필 메뉴 */}
        <Link to={"/profile"}>
          <MenuItem>
            <svg
              className="w-6 h-6 text-gray-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm10 5a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-8-5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm1.942 4a3 3 0 0 0-2.847 2.051l-.044.133-.004.012c-.042.126-.055.167-.042.195.006.013.02.023.038.039.032.025.08.064.146.155A1 1 0 0 0 6 17h6a1 1 0 0 0 .811-.415.713.713 0 0 1 .146-.155c.019-.016.031-.026.038-.04.014-.027 0-.068-.042-.194l-.004-.012-.044-.133A3 3 0 0 0 10.059 14H7.942Z"
                clipRule="evenodd"
              />
            </svg>
          </MenuItem>
        </Link>

        {/* 로그아웃 */}
        <BottomMenu>
          <MenuItem onClick={signOut}>
            <svg
              className="w-6 h-6 text-gray-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 12H8m12 0-4 4m4-4-4-4M9 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h2"
              />
            </svg>
          </MenuItem>
        </BottomMenu>
      </Navigator>

      <MainContent>
        <Outlet />
      </MainContent>
    </Container>
  );
};
