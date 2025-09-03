//개선된 버전 - IMPROVED_VERSION with Theme Support
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import YouTubeMusicPlayer from "../screens/music";
import { useTheme } from "../components/ThemeContext";
import React, {
  useEffect,
  useState,
  useMemo,
  createContext,
  useContext,
  useRef,
} from "react";

// 이미지 모달 컨텍스트 생성
interface ImageModalContextType {
  openModal: (src: string) => void;
  closeModal: () => void;
}

const ImageModalContext = createContext<ImageModalContextType | null>(null);

export const useImageModal = () => {
  const context = useContext(ImageModalContext);
  if (!context) {
    throw new Error("useImageModal must be used within ImageModalProvider");
  }
  return context;
};

const LayoutWrapper = styled.div<{ $isDark: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: ${(props) => (props.$isDark ? "#000000" : "#ffffff")};
  transition: background-color 0.3s ease;
`;

const Header = styled.div<{ $isDark: boolean }>`
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: ${(props) => (props.$isDark ? "#202020" : "#ffffff")};
  border-bottom: 1px solid ${(props) => (props.$isDark ? "#404040" : "#f0f0f0")};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
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
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Navigator = styled.div<{ $isDark: boolean }>`
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: ${(props) => (props.$isDark ? "#202020" : "#ffffff")};
  border-right: 1px solid ${(props) => (props.$isDark ? "#404040" : "#f0f0f0")};
  padding: 20px 12px 16px;
  overflow-y: auto;
  min-height: 0;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
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

const MainContent = styled.div<{
  $isDark: boolean;
  $isFullscreenMusic: boolean;
}>`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  background: ${(props) => (props.$isDark ? "#000000" : "#ffffff")};
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  height: calc(100vh - 70px); /* 명시적 높이 설정 */
  min-height: 0;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${(props) => (props.$isDark ? "#202020" : "#f1f1f1")};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => (props.$isDark ? "#404040" : "#c1c1c1")};
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${(props) => (props.$isDark ? "#606060" : "#a1a1a1")};
  }
`;

const ContentContainer = styled.div<{ $isFullscreenMusic: boolean }>`
  display: flex;
  width: 100%;
  height: 100%;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  justify-content: ${(props) =>
    props.$isFullscreenMusic ? "flex-end" : "flex-start"};
  overflow: hidden; /* 부모에서 overflow 제어 */
`;

const MusicPlayerContainer = styled.div<{ $isFullscreenMusic: boolean }>`
  width: ${(props) => (props.$isFullscreenMusic ? "100%" : "33.33%")};
  min-width: 320px;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
  border-radius: 15px;
  position: relative;
  border-left: none;
  box-shadow: ${(props) =>
    props.$isFullscreenMusic ? "none" : "-2px 0 8px rgba(0, 0, 0, 0.04)"};
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: right center;
`;

const GradientOverlay = styled.div<{
  color1: string;
  color2: string;
  $isFullscreenMusic: boolean;
}>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: ${(props) =>
    props.$isFullscreenMusic ? "10px" : "20px 0 0 0"};
  background: linear-gradient(
    135deg,
    ${(props) => props.color1},
    ${(props) => props.color2}
  );
  opacity: 1;
  animation: fadeIn 0.8s ease;
  transition: border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1);

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

const FullscreenExitButton = styled.button<{ $isVisible: boolean }>`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  z-index: 1000;
  display: ${(props) => (props.$isVisible ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const TooltipContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 이미지 모달 스타일 추가
const ImageModal = styled.div<{ $isOpen: boolean; $isDark: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(10px);
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  visibility: ${(props) => (props.$isOpen ? "visible" : "hidden")};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: ${(props) => (props.$isOpen ? "auto" : "none")};
`;

const ModalImage = styled.img<{ $isOpen: boolean }>`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  user-select: none;
  pointer-events: auto;
  transform: ${(props) => (props.$isOpen ? "scale(1)" : "scale(0.8)")};
  transition: transform 0.2s ease;
`;

const ModalCloseButton = styled.button<{ $isOpen: boolean }>`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  z-index: 100000;
  pointer-events: auto;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  transform: ${(props) => (props.$isOpen ? "scale(1)" : "scale(0.8)")};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: ${(props) => (props.$isOpen ? "scale(1.1)" : "scale(0.8)")};
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const Layout = () => {
  const { isDarkMode } = useTheme();
  const [gradientLayers, setGradientLayers] = useState<
    { id: number; color1: string; color2: string }[]
  >([]);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [secondaryColor, setSecondaryColor] = useState<string | null>(null);
  const [imageModalSrc, setImageModalSrc] = useState<string | null>(null);
  const navi = useNavigate();
  const location = useLocation();

  // music 페이지 여부 및 숨김 여부 확인
  const hidePlayer =
    location.pathname === "/signin" || location.pathname === "/signup";
  const isFullscreenMusic = location.pathname === "/music";

  // 음악 플레이어를 한 번만 생성하고 재사용 (의존성 배열에서 isFullscreenMusic 제거)
  const MemoizedMusicPlayer = useMemo(
    () => (
      <YouTubeMusicPlayer
        onColorExtract={setDominantColor}
        onColorExtractSecondary={setSecondaryColor}
        isFullScreenMode={isFullscreenMusic} // props로 전달하되 의존성에서 제외
      />
    ),
    [] // 빈 의존성 배열로 한 번만 생성
  );

  const signOut = async () => {
    const isOK = window.confirm("정말로 로그아웃 하실 건가요?");
    if (isOK) {
      await auth.signOut();
      navi("/signin");
    }
  };

  const exitFullscreen = () => {
    navi("/"); // 홈으로 이동
  };

  const closeImageModal = () => {
    setImageModalSrc(null);
    document.body.style.overflow = "auto";
  };

  // 컨텍스트 값
  const imageModalContextValue = useMemo(
    () => ({
      openModal: (src: string) => {
        // 딜레이 없이 즉시 설정
        setImageModalSrc(src);
        document.body.style.overflow = "hidden";
      },
      closeModal: closeImageModal,
    }),
    []
  );

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && imageModalSrc) {
        closeImageModal();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [imageModalSrc]);

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
    <ImageModalContext.Provider value={imageModalContextValue}>
      <LayoutWrapper $isDark={isDarkMode}>
        <Header $isDark={isDarkMode}>
          <Logo src="/uplogo.png" alt="uplogo" />
        </Header>
        <Body>
          <Navigator $isDark={isDarkMode}>
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

              <Link to="/music" style={{ textDecoration: "none" }}>
                <TooltipContainer>
                  <MenuItem isActive={location.pathname === "/music"}>
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
                        d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
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
            </MenuSection>

            {/* 상단 구분선은 삭제 */}
            {/* <MenuDivider /> */}

            <MenuSection>
              {/* 프로필 버튼 */}
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

              {/* 알림 버튼 */}
              <TooltipContainer>
                <MenuItem>
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
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.57 3.535.882 5.454 1.312m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.75 21h16.5"
                    />
                  </svg>
                </MenuItem>
              </TooltipContainer>

              {/* 설정 버튼 */}
              <TooltipContainer>
                <MenuItem>
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
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                </MenuItem>
              </TooltipContainer>

              <MenuDivider />
            </MenuSection>

            <BottomMenu>
              {/* 로그아웃 버튼 */}
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

          <ContentContainer $isFullscreenMusic={isFullscreenMusic}>
            {!isFullscreenMusic && (
              <MainContent
                $isDark={isDarkMode}
                $isFullscreenMusic={isFullscreenMusic}
              >
                <div
                  style={{
                    minHeight: "100%",
                    position: "relative",
                    paddingBottom: "20px",
                  }}
                  data-timeline-container
                >
                  <Outlet />
                </div>
              </MainContent>
            )}
            {!hidePlayer && (
              <MusicPlayerContainer $isFullscreenMusic={isFullscreenMusic}>
                <FullscreenExitButton
                  $isVisible={isFullscreenMusic}
                  onClick={exitFullscreen}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </FullscreenExitButton>
                {gradientLayers.map((layer, index) => (
                  <GradientOverlay
                    key={layer.id}
                    className={
                      index === gradientLayers.length - 1 ? "fading" : ""
                    }
                    color1={layer.color1}
                    color2={layer.color2}
                    $isFullscreenMusic={isFullscreenMusic}
                  />
                ))}
                {MemoizedMusicPlayer}
              </MusicPlayerContainer>
            )}
          </ContentContainer>
        </Body>

        {/* 이미지 전체화면 모달 - 항상 렌더링 */}
        <ImageModal
          $isOpen={!!imageModalSrc}
          $isDark={isDarkMode}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeImageModal();
            }
          }}
        >
          <ModalCloseButton $isOpen={!!imageModalSrc} onClick={closeImageModal}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </ModalCloseButton>
          {imageModalSrc && (
            <ModalImage
              src={imageModalSrc}
              alt="확대된 이미지"
              $isOpen={!!imageModalSrc}
              onError={() => {
                console.log("이미지 로드 실패");
                closeImageModal();
              }}
            />
          )}
        </ImageModal>
      </LayoutWrapper>
    </ImageModalContext.Provider>
  );
};

export default Layout;
