import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import styled, { createGlobalStyle } from "styled-components";
import Home from "./screens/home";
import Profile from "./screens/profile";
import Signin from "./screens/signin";
import Signup from "./screens/signup";
import reset from "styled-reset";
import { auth } from "./firebaseConfig";
import { useEffect, useState } from "react";
import LoadingScreen from "./screens/loading-screen";
import ProtectedRouter from "./components/protected-router";
import Layout from "./screens/layout";
import "moment/locale/ko";

// React-Router-Dom 을 활용해 사이트의 Page 관리
// - Page : home, profile, signin, signup
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRouter>
        <Layout />
      </ProtectedRouter>
    ),
    children: [
      {
        // home
        path: "",
        element: <Home />,
      },
      {
        // profile
        path: "profile",
        element: <Profile />,
      },
    ],
  },
  {
    // signin
    path: "/signin",
    element: <Signin />,
  },
  {
    // signup
    path: "/signup",
    element: <Signup />,
  },
]);

// 중앙정렬 & 화면크기만큼
const Container = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
`;

function App() {
  // 로그인 여부 파악을 위한 로딩 상태(State)
  const [loading, setLoading] = useState<boolean>(true);

  // Server(Firebase)를 통해 현재 로그인한지 안한지 확인
  // - Server API ... 속도의 차이 => 비동기형 함수
  const init = async () => {
    // 로딩 Start (=이미 true 로딩이 시작되어있음)
    // Firebase 가 로그인 인증 여부 파악
    await auth.authStateReady();
    // 로딩 Finish
    setLoading(false);
  };

  // 실행 : 페이지가 렌더링될 때(=접속했을 때) 실행되는 함수
  useEffect(() => {
    // 로그인 여부 파악(1번만)
    init();
  }, []);

  // Page Rendering Area
  // - A.로그인을 한 경우   > Home화면으로 이동
  // - B.로그인을 안한 경우 > Login화면으로 이동
  // + C.로딩하는 동안 보여줄 loading-screen 필요
  // 삼항연산자 >> 조건문 ? 참 : 거짓;
  // return 로딩중이라면? 로딩화면 or 홈/로그인

  return loading ? (
    <LoadingScreen />
  ) : (
    <Container className="App">
      <GlobalStyle />
      <RouterProvider router={router}></RouterProvider>
    </Container>
  );
}

export default App;

// 공통적으로 전역에서 사용할 Global CSS Style
const GlobalStyle = createGlobalStyle`
  ${reset}
  body{
    background-color: #004cb7;
    color: white;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
`;
