import { RouterProvider, createBrowserRouter } from "react-router-dom";
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
import KategorieFunction from "./components/KategorieFunction";
import InputPostScreen from "./screens/InputPostScreen";
import YouTubeMusicPlayer from "./screens/music";
import { MusicPlayerProvider } from "./components/MusicFunction";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import Playlist from "./components/playlist";
import UserProfileScreen from "./screens/user-profile";
import { RelationsProvider } from "./components/RelationsContext";


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
        path: "",
        element: <Home />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "music",
        element: <Playlist />,
      },
      {
        path: "KategorieFunction",
        element: <KategorieFunction />,
      },
      {
        path: "InputPostScreen",
        element: <InputPostScreen />,
      },
      { 
        path: "user/:uid", 
        element: <UserProfileScreen /> 
      },
    ],
  },
  {
    path: "/signin",
    element: <Signin />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
]);

const Container = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
`;

// GlobalStyle을 테마에 맞게 동적으로 적용하는 컴포넌트
const ThemedGlobalStyle = createGlobalStyle<{ $isDark: boolean }>`
  ${reset}
  html, body, #root {
    height: 100%;
    background: ${(props) => (props.$isDark ? "#000000" : "#ffffff")};
  }

  body {
    background: ${(props) => (props.$isDark ? "#000000" : "#ffffff")};
    color: ${(props) => (props.$isDark ? "#ffffff" : "#1a1a1a")};
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  * {
    box-sizing: border-box;
  }
`;

// 내부 App 컴포넌트 (테마 컨텍스트를 사용할 수 있음)
const AppContent = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);

  const init = async () => {
    await auth.authStateReady();
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <ThemedGlobalStyle $isDark={isDarkMode} />
      {loading ? (
        <LoadingScreen />
      ) : (
        <Container className="App">
          <RouterProvider router={router} />
        </Container>
      )}
    </>
  );
};

// 메인 App 컴포넌트
function App() {
  return (
    <ThemeProvider>
      <MusicPlayerProvider>
        <RelationsProvider>
          <AppContent />
        </RelationsProvider>
      </MusicPlayerProvider>
    </ThemeProvider>
  );
}

export default App;
