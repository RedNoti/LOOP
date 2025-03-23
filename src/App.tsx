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
import YouTubeMusicPlayer from "./screens/music"; // YouTubeMusicPlayer 컴포넌트 import
import "moment/locale/ko";
import KategorieFunction from "./components/KategorieFunction";
import InputPostScreen from "./screens/InputPostScreen";

// React-Router-Dom 을 활용해 사이트의 Page 관리
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
      {
        // music
        path: "music", // '/music' 경로 추가
        element: <YouTubeMusicPlayer />, // YouTubeMusicPlayer 컴포넌트 추가
      },
      {
        // KategorieFunction
        path: "KategorieFunction", // '/music' 경로 추가
        element: <KategorieFunction />, // YouTubeMusicPlayer 컴포넌트 추가
      },
      {
        // InputPostScreen
        path: "InputPostScreen", // '/music' 경로 추가
        element: <InputPostScreen />, // YouTubeMusicPlayer 컴포넌트 추가
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

  const init = async () => {
    // 로딩 Start (=이미 true 로딩이 시작되어있음)
    await auth.authStateReady();
    // 로딩 Finish
    setLoading(false);
  };

  useEffect(() => {
    // 로그인 여부 파악(1번만)
    init();
  }, []);

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
    background-color:rgb(0, 0, 0);
    color: white;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
`;
