//개선된 버전 - IMPROVED_VERSION
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import YouTubeMusicPlayer from "../screens/music";
import React, { useEffect, useState, useMemo } from "react";

const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #ffffff;
`;

const Header = styled.div`
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const Logo = styled.img`
  width: clamp(100px, 12vw, 150px);
  height: auto;
  object-fit: contain;
`;

const Body = styled.div`
  height: calc(100vh - 70px);
  display: flex;
  overflow: hidden;
`;

const Navigator = styled.div`
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border-right: 1px solid #f0f0f0;
  padding: 20px 12px 16px;
  overflow-y: auto;
  min-height: 0;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
`;

const MenuItem = styled.div<{ isActive?: boolean }>`
  border-radius: 14px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${(props) => (props.isActive ? "#007aff" : "transparent")};
  position: relative;

  svg,
  img {
    width: 22px;
    height: 22px;
    transition: all 0.15s ease;
    color: ${(props) => (props.isActive ? "#ffffff" : "#6c757d")};
    filter: ${(props) => (props.isActive ? "brightness(0) invert(1)" : "none")};
  }

  &:hover {
    background: ${(props) => (props.isActive ? "#0051d0" : "#f8f9fa")};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

    svg,
    img {
      color: ${(props) => (props.isActive ? "#ffffff" : "#495057")};
      transform: scale(1.1);
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  // 활성 상태 표시 점
  ${(props) =>
    props.isActive &&
    `
    &::after {
      content: '';
      position: absolute;
      right: -10px;
      width: 3px;
      height: 20px;
      background: #007aff;
      border-radius: 2px;
    }
  `}
`;

const MenuSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  align-items: center;
`;

const MenuDivider = styled.div`
  width: 28px;
  height: 1px;
  background: #e9ecef;
  margin: 10px 0;
`;

const BottomMenu = styled.div`
  margin-top: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const MainContent = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  background: #ffffff;
`;

const ContentContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const MusicPlayerContainer = styled.div`
  width: 33.33%;
  min-width: 320px;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
  border-radius: 20px 0 0 0;
  position: relative;
  background: #ffffff;
  border-left: 1px solid #f0f0f0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
`;

const GradientOverlay = styled.div<{ color1: string; color2: string }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 20px 0 0 0;
  background: linear-gradient(
    135deg,
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

const TooltipContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 툴팁 스타일 제거됨

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
    if (dominantColor && secondaryColor) {
      const newLayer = {
        id: Date.now(),
        color1: dominantColor,
        color2: secondaryColor,
      };
      setGradientLayers((prev) => {
        const updated = [...prev, newLayer];
        return updated.slice(-1);
      });
    }
  }, [dominantColor, secondaryColor]);

  return (
    <LayoutWrapper>
      <Header>
        <Logo src="/uplogo.png" alt="uplogo" />
      </Header>
      <Body>
        <Navigator>
          <MenuSection>
            <Link to="/" style={{ textDecoration: "none" }}>
              <TooltipContainer>
                <MenuItem isActive={location.pathname === "/"}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>
                </MenuItem>
              </TooltipContainer>
            </Link>

            <Link to="/InputPostScreen" style={{ textDecoration: "none" }}>
              <TooltipContainer>
                <MenuItem isActive={location.pathname === "/InputPostScreen"}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </MenuItem>
              </TooltipContainer>
            </Link>

            <Link to="/profile" style={{ textDecoration: "none" }}>
              <TooltipContainer>
                <MenuItem isActive={location.pathname === "/profile"}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </MenuItem>
              </TooltipContainer>
            </Link>
          </MenuSection>

          <MenuDivider />

          <BottomMenu>
            <TooltipContainer>
              <MenuItem onClick={signOut}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
                  />
                </svg>
              </MenuItem>
            </TooltipContainer>
          </BottomMenu>
        </Navigator>

        <ContentContainer>
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
            <MusicPlayerContainer>
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
            </MusicPlayerContainer>
          )}
        </ContentContainer>
      </Body>
    </LayoutWrapper>
  );
};
