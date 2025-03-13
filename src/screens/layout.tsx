import { Link, Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 5fr;
  gap: 30px;
  width: 100%;
  padding: 20px;
`;
const Navigator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
`;
const MenuItem = styled.div`
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  svg {
    width: 40px;
    height: 40px;
    fill: white;
  }
`;
const BottomMenu = styled.div`
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  flex: 1;
`;

export default () => {
  // Page Logic
  const navi = useNavigate();

  // 로그아웃 함수
  const signOut = async () => {
    // + 확인절차
    const isOK = window.confirm("정말로 로그아웃 하실 건가요?");
    if (isOK) {
      // 로그아웃
      await auth.signOut();
      // 로그아웃 뒤에 -> 로그인화면으로 이동
      navi("/signin");
    }
  };

  // Page Design Redering
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
                fill-rule="evenodd"
                d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z"
                clip-rule="evenodd"
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
                fill-rule="evenodd"
                d="M21.7 8.037a4.26 4.26 0 0 0-.789-1.964 2.84 2.84 0 0 0-1.984-.839c-2.767-.2-6.926-.2-6.926-.2s-4.157 0-6.928.2a2.836 2.836 0 0 0-1.983.839 4.225 4.225 0 0 0-.79 1.965 30.146 30.146 0 0 0-.2 3.206v1.5a30.12 30.12 0 0 0 .2 3.206c.094.712.364 1.39.784 1.972.604.536 1.38.837 2.187.848 1.583.151 6.731.2 6.731.2s4.161 0 6.928-.2a2.844 2.844 0 0 0 1.985-.84 4.27 4.27 0 0 0 .787-1.965 30.12 30.12 0 0 0 .2-3.206v-1.516a30.672 30.672 0 0 0-.202-3.206Zm-11.692 6.554v-5.62l5.4 2.819-5.4 2.801Z"
                clip-rule="evenodd"
              />
            </svg>
          </MenuItem>
        </Link>
        <BottomMenu>
          {/* 로그아웃 메뉴 */}
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
      <Outlet />
    </Container>
  );
};
