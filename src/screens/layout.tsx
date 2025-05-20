//구버전-OLD_VERSION
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import YouTubeMusicPlayer from "../screens/music"; // ✅ music.tsx에서 가져옴
import React, { useEffect, useState, useMemo } from "react";

const LayoutWrapper = styled.div`
  // 🎨 styled-components 스타일 정의
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
`;

const Header = styled.div`
  // 🎨 styled-components 스타일 정의
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-left: 20px;
  background-color: black;
`;

const Logo = styled.img`
  // 🎨 styled-components 스타일 정의
  width: clamp(100px, 12vw, 150px);
  height: auto;
  object-fit: contain;
`;

const Body = styled.div`
  // 🎨 styled-components 스타일 정의
  height: calc(100vh - 70px);
  display: flex;
  overflow: hidden;
`;

const Navigator = styled.div`
  // 🎨 styled-components 스타일 정의
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  background-color: rgb(39, 39, 39);
  border-radius: 0 15px 15px 0;
  padding-top: 20px;
  padding-bottom: 16px;
  overflow-y: overlay;
  min-height: 0;
  flex-shrink: 0;
`;

const MenuItem = styled.div`
  // 🎨 styled-components 스타일 정의
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  svg,
  img {
    width: 30px;
    height: 30px;
    transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  }
  &:hover {
    transform: scale(1.12);
  }
  &.active,
  &:active {
    transform: scale(1.2);
  }
`;

const BottomMenu = styled.div`
  // 🎨 styled-components 스타일 정의
  margin-top: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const MainContent = styled.div`
  // 🎨 styled-components 스타일 정의
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
`;

const GradientOverlay = styled.div<{ color1: string; color2: string }>`
  // 🎨 styled-components 스타일 정의
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 15px;
  background: linear-gradient(
    to bottom,
    ${(props) => props.color1},
    ${(props) => props.color2}
  );
  opacity: 1;
  animation: fadeIn 0.8s ease;

  &.fading {
    opacity: 0;
    animation: fadeIn 0.8s ease forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export default () => {
  const [gradientLayers, setGradientLayers] = useState<
    { id: number; color1: string; color2: string }[]
  >([]);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [secondaryColor, setSecondaryColor] = useState<string | null>(null);
  const navi = useNavigate();
  const location = useLocation();
  const hidePlayer =
    location.pathname === "/signin" || location.pathname === "/signup";

  // 메모이제이션된 YouTubeMusicPlayer 컴포넌트
  const MemoizedMusicPlayer = useMemo(
    () => (
      <YouTubeMusicPlayer
        onColorExtract={setDominantColor}
        onColorExtractSecondary={setSecondaryColor}
      />
    ),
    []
  );

  const signOut = async () => {
    const isOK = window.confirm("정말로 로그아웃 하실 건가요?");
    if (isOK) {
      await auth.signOut();
      navi("/signin");
    }
  };

  useEffect(() => {
    // 🔁 컴포넌트 마운트 시 실행되는 훅
    if (dominantColor && secondaryColor) {
      const newLayer = {
        id: Date.now(),
        color1: dominantColor,
        color2: secondaryColor,
      };
      setGradientLayers((prev) => {
        const updated = [...prev, newLayer];
        return updated.slice(-1); // ✅ 최신 1개만 유지
      });
    }
  }, [dominantColor, secondaryColor]);

  return (
    // 🔚 컴포넌트의 JSX 반환 시작
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
            <MenuItem
              className={
                location.pathname === "/InputPostScreen" ? "active" : ""
              }
            >
              <img src="/icon/post_add_icon.svg" alt="글쓰기" />
            </MenuItem>
          </Link>

          <Link to="/profile">
            <MenuItem
              className={location.pathname === "/profile" ? "active" : ""}
            >
              <img src="/icon/profile_Icon.svg" alt="프로필" />
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

        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          <MainContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100%",
              }}
            >
              <Outlet />
            </div>
          </MainContent>
          {!hidePlayer && (
            <div
              style={{
                width: "33.33%",
                minWidth: "320px",
                height: "100%",
                boxSizing: "border-box",
                borderLeft: "none",
                padding: 0,
                overflow: "hidden",
                borderTopRightRadius: "15px",
                borderBottomRightRadius: "15px",
                borderTopLeftRadius: "15px",
                borderBottomLeftRadius: "15px",
                position: "relative", // ✅ needed for overlay
              }}
            >
              {gradientLayers.map((layer, index) => (
                <GradientOverlay
                  key={layer.id}
                  className={
                    index === gradientLayers.length - 1 ? "fading" : ""
                  }
                  color1={layer.color1}
                  color2={layer.color2}
                />
              ))}
              {MemoizedMusicPlayer}
            </div>
          )}
        </div>
      </Body>
    </LayoutWrapper>
  );
};
