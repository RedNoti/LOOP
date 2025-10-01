// App.tsx
import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
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
import Playlist from "./components/playlist";
import UserProfileScreen from "./screens/user-profile";
import { MusicPlayerProvider } from "./components/MusicFunction";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { RelationsProvider } from "./components/RelationsContext";
import Settings from "./screens/Settingbutton/settings";
import ProfileSettings from "./screens/Settingbutton/ProfileSettings";
import BlockSettings from "./screens/Settingbutton/BlockSettings";
import MusicStation from "./screens/Station";
import DmScreen from "./screens/dm";

// ✅ 알림 화면(파일명 단수)
import Notifications from "./screens/notification";

// ✅ 개인정보 설정 화면 import
import PrivacySettings from "./screens/Settingbutton/PrivacySettings"; // ← 추가

/* =========================
 * Router
 * ========================= */
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRouter>
        <Layout />
      </ProtectedRouter>
    ),
    children: [
      { path: "", element: <Home /> },
      { path: "profile", element: <Profile /> },
      { path: "music", element: <Playlist /> },
      { path: "station", element: <MusicStation /> },
      { path: "KategorieFunction", element: <KategorieFunction /> },
      { path: "InputPostScreen", element: <InputPostScreen /> },
      { path: "user/:uid", element: <UserProfileScreen /> },

      { path: "dm", element: <DmScreen /> },

      // ✅ 알림 (단수 경로)
      { path: "notification", element: <Notifications /> },
      // ✅ 복수로 접근해도 단수로 리다이렉트
      {
        path: "notifications",
        element: <Navigate to="/notification" replace />,
      },

      // 설정
      { path: "settings", element: <Settings /> },
      { path: "settings/profile", element: <ProfileSettings /> },
      { path: "settings/block", element: <BlockSettings /> },

      // ✅ 개인정보 설정 라우트
      { path: "settings/privacy", element: <PrivacySettings /> }, // ← 추가
    ],
  },
  { path: "/signin", element: <Signin /> },
  { path: "/signup", element: <Signup /> },
]);

/* =========================
 * Global Styles with Theme Tokens
 * ========================= */
const ThemedGlobalStyle = createGlobalStyle<{ $isDark: boolean }>`
  ${reset}

  html, body, #root { height: 100%; }

  /* === Theme Tokens === */
  /* 기본(라이트) 값 */
  body {
    /* Surfaces / Backgrounds */
    --bg:            #ffffff;
    --surface:       #ffffff;
    --surface-2:     #f8f9fa;
    --elevated:      #ffffff;

    /* Text */
    --text-primary:   #1a1a1a;
    --text-secondary: #495057;
    --text-tertiary:  #868e96;

    /* Border / States */
    --border:        #e9ecef;
    --hover:         #f8f9fa;
    --focus:         #007aff33;

    /* Accent */
    --accent:        #007aff;
    --accent-weak:   rgba(0,122,255,.12);
    --accent-weak-2: rgba(0,122,255,.08);

    /* Status */
    --danger:        #ff3b30;

    /* Icons */
    --icon-muted:    #6c757d;
    --icon-strong:   #212529;

    background: var(--bg);
    color: var(--text-primary);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    transition: background-color .3s ease, color .3s ease;
  }

  /* 다크 오버라이드 */
  ${(p) =>
    p.$isDark
      ? `
    body {
      --bg:            #000000;
      --surface:       #000000;
      --surface-2:     #0e0e0e;
      --elevated:      #111111;

      --text-primary:   #e6e6e6;
      --text-secondary: #b5b8bd;
      --text-tertiary:  #8a8f98;

      --border:        #303030;
      --hover:         #1b1b1b;
      --focus:         #007aff33;

      --accent:        #0a84ff;          /* 다크에서 약간 더 밝게 */
      --accent-weak:   rgba(10,132,255,.14);
      --accent-weak-2: rgba(10,132,255,.10);

      --danger:        #ff453a;

      --icon-muted:    #9aa0a6;
      --icon-strong:   #e6e6e6;

      background: var(--bg);
      color: var(--text-primary);
    }
  `
      : ""}

  * { box-sizing: border-box; }
`;

const Container = styled.div`
  height: 100vh;
  width: 100vw; /* fixed/viewport 기준 오버레이 안정화 */
  display: flex;
  justify-content: center;
`;

/* =========================
 * AppContent
 * ========================= */
const AppContent = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      await auth.authStateReady();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <>
        <ThemedGlobalStyle $isDark={isDarkMode} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <ThemedGlobalStyle $isDark={isDarkMode} />
      <Container className="App">
        <RelationsProvider>
          <RouterProvider router={router} />
        </RelationsProvider>
      </Container>
    </>
  );
};

/* =========================
 * App
 * ========================= */
function App() {
  return (
    <ThemeProvider>
      <MusicPlayerProvider>
        <AppContent />
      </MusicPlayerProvider>
    </ThemeProvider>
  );
}

export default App;
