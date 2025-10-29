// screens/layout.tsx
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
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";


/* ---------- Image Modal Context ---------- */
interface ImageModalContextType {
  openModal: (src: string) => void;
  closeModal: () => void;
}
const ImageModalContext = createContext<ImageModalContextType | null>(null);
export const useImageModal = () => {
  const ctx = useContext(ImageModalContext);
  if (!ctx)
    throw new Error("useImageModal must be used within ImageModalProvider");
  return ctx;
};


/* ---------- Styled ---------- */
const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg);
  transition: background-color 0.3s ease;
`;

const Header = styled.div`
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
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

const Navigator = styled.div`
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border-right: 1px solid var(--border);
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
  position: relative;
  background: ${(p) => (p.isActive ? "var(--accent)" : "transparent")};

  svg,
  img {
    width: 22px;
    height: 22px;
    transition: all 0.15s ease;
    color: ${(p) => (p.isActive ? "#ffffff" : "var(--icon-muted)")};
    filter: ${(p) => (p.isActive ? "brightness(0) invert(1)" : "none")};
  }

  &:hover {
    background: ${(p) =>
      p.isActive
        ? "color-mix(in srgb, var(--accent) 85%, black 15%)"
        : "var(--hover)"};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    svg,
    img {
      color: ${(p) => (p.isActive ? "#ffffff" : "var(--icon-strong)")};
      transform: scale(1.1);
    }
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  ${(p) =>
    p.isActive &&
    `
    &::after{
      content:''; position:absolute; right:-10px; width:3px; height:20px;
      background: var(--accent); border-radius: 2px;
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
  background: var(--border);
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
  $isFullscreenMusic: boolean;
  $lock?: boolean;
}>`
  flex: 1;
  overflow-x: hidden;
  overflow-y: ${(p) => (p.$lock ? "hidden" : "auto")};
  background: var(--bg);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  height: calc(100vh - 70px);
  min-height: 0;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: var(--surface-2);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--border) 70%, #888 30%);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--border) 30%, #888 70%);
  }
`;

const ContentContainer = styled.div<{ $isFullscreenMusic: boolean }>`
  display: flex;
  width: 100%;
  height: 100%;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  justify-content: ${(p) => (p.$isFullscreenMusic ? "flex-end" : "flex-start")};
  overflow: hidden;
`;

const MusicPlayerContainer = styled.div<{ $isFullscreenMusic: boolean }>`
  width: ${(p) => (p.$isFullscreenMusic ? "100%" : "33.33%")};
  min-width: 320px;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
  border-radius: 15px;
  position: relative;
  border-left: none;
  box-shadow: ${(p) =>
    p.$isFullscreenMusic ? "none" : "-2px 0 8px rgba(0,0,0,0.04)"};
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: right center;
`;

const GradientOverlay = styled.div<{
  color1: string;
  color2: string;
  $isFullscreenMusic: boolean;
}>`
  position: absolute;
  inset: 0;
  border-radius: ${(p) => (p.$isFullscreenMusic ? "10px" : "20px 0 0 0")};
  background: linear-gradient(135deg, ${(p) => p.color1}, ${(p) => p.color2});
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
  color: #fff;
  cursor: pointer;
  z-index: 1000;
  display: ${(p) => (p.$isVisible ? "flex" : "none")};
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

const ImageModal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(10px);
  opacity: ${(p) => (p.$isOpen ? 1 : 0)};
  visibility: ${(p) => (p.$isOpen ? "visible" : "hidden")};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: ${(p) => (p.$isOpen ? "auto" : "none")};
`;

const ModalImage = styled.img<{ $isOpen: boolean }>`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  user-select: none;
  pointer-events: auto;
  transform: ${(p) => (p.$isOpen ? "scale(1)" : "scale(0.8)")};
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
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  z-index: 100000;
  pointer-events: auto;
  opacity: ${(p) => (p.$isOpen ? 1 : 0)};
  transform: ${(p) => (p.$isOpen ? "scale(1)" : "scale(0.8)")};
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: ${(p) => (p.$isOpen ? "scale(1.1)" : "scale(0.8)")};
  }
  svg {
    width: 24px;
    height: 24px;
  }
`;

/* ✅ 배지 스타일 */
const Badge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px var(--bg);
`;

/* ---------- Component ---------- */
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

  const hidePlayer =
    location.pathname === "/signin" || location.pathname === "/signup";
  const isFullscreenMusic = location.pathname === "/music";

  /** ⬇️ DM 화면 여부 판단 */
  const isDM = location.pathname.startsWith("/dm");

  const MemoizedMusicPlayer = useMemo(
    () => (
      <YouTubeMusicPlayer
        onColorExtract={setDominantColor}
        onColorExtractSecondary={setSecondaryColor}
        isFullScreenMode={isFullscreenMusic}
      />
    ),
    [isFullscreenMusic]
  );

  const signOut = async () => {
    const isOK = window.confirm("정말로 로그아웃 하실 건가요?");
    if (isOK) {
      await auth.signOut();
      navi("/signin");
    }
  };

  const exitFullscreen = () => {
    navi("/");
  };

  const closeImageModal = () => {
    setImageModalSrc(null);
    document.body.style.overflow = "auto";
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && imageModalSrc) closeImageModal();
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
      setGradientLayers((prev) => [...prev, newLayer].slice(-1));
    }
  }, [dominantColor, secondaryColor]);

  /* ===================== 🔔 미읽음 카운트 훅 (로컬 DM + Firestore 통합) ===================== */
const inboxKey = (uid?: string | null) =>
  uid ? `notif_inbox_${uid}` : `notif_inbox_guest`;

// 로컬 DM 미읽음 카운트
const getUnreadDm = (uid?: string | null) => {
  try {
    const raw = localStorage.getItem(inboxKey(uid));
    if (!raw) return 0;
    const list = JSON.parse(raw) as { read?: boolean }[];
    return list.reduce((n, i) => n + (i?.read ? 0 : 1), 0);
  } catch {
    return 0;
  }
};

const [unread, setUnread] = useState(0);       // 최종 합산 배지 숫자
const [unreadDm, setUnreadDm] = useState(0);   // 로컬 DM 미읽음
const [unreadFs, setUnreadFs] = useState(0);   // Firestore 미읽음(팔로우/좋아요/댓글/DM 등)

// 최종 합산
useEffect(() => {
  setUnread(unreadDm + unreadFs);
}, [unreadDm, unreadFs]);

// 로그인 상태 변화/탭 이벤트에 따라 로컬 DM 미읽음 갱신
useEffect(() => {
  let currentUid: string | null = auth.currentUser?.uid ?? null;

  const refreshDm = () => setUnreadDm(getUnreadDm(currentUid));

  // 초기값
  refreshDm();

  // 로그인 상태 변동
  const unsubAuth = onAuthStateChanged(auth, (u) => {
    currentUid = u?.uid ?? null;
    refreshDm();
  });

  // 다른 탭에서 localStorage 변경
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === inboxKey(currentUid)) refreshDm();
  };
  window.addEventListener("storage", onStorage);

  // 같은 탭에서 우리가 쏘는 이벤트
  const onBump = () => refreshDm();
  window.addEventListener("notif_inbox_updated", onBump);

  // 포커스/탭 전환 시 갱신
  const onFocus = () => refreshDm();
  window.addEventListener("visibilitychange", onFocus);
  window.addEventListener("focus", onFocus);

  return () => {
    unsubAuth();
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("notif_inbox_updated", onBump);
    window.removeEventListener("visibilitychange", onFocus);
    window.removeEventListener("focus", onFocus);
  };
}, []);

// Firestore 미읽음 카운트 실시간 구독
useEffect(() => {
  // uid 없으면 0으로
  if (!auth.currentUser?.uid) {
    setUnreadFs(0);
    return;
  }
  const me = auth.currentUser.uid;

  // notifications/{uid}/inbox 에서 read == false 만 카운트
  const q = query(
    collection(db, "notifications", me, "inbox"),
    where("read", "==", false)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      // 단순히 개수만 세면 성능/비용 둘 다 좋음
      setUnreadFs(snap.size || 0);
    },
    (err) => {
      console.error("FS unread count listen error:", err);
      // 에러 시 배지 0으로 폴백 (원하면 유지)
      setUnreadFs(0);
    }
  );

  return () => unsub();
}, [auth.currentUser?.uid]);

// 알림 페이지 진입 시에도 한 번 갱신(선택)
useEffect(() => {
  if (location.pathname.startsWith("/notification")) {
    setUnreadDm(getUnreadDm(auth.currentUser?.uid ?? null));
    // Firestore쪽은 onSnapshot이 실시간으로 반영 중이므로 별도 작업 불필요
  }
}, [location.pathname]);
/* ===================== /미읽음 카운트 ===================== */


  return (
    <ImageModalContext.Provider
      value={{
        openModal: (src: string) => {
          setImageModalSrc(src);
          document.body.style.overflow = "hidden";
        },
        closeModal: closeImageModal,
      }}
    >
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
              <Link to="/following" style={{ textDecoration: "none" }}>
              <TooltipContainer>
              <MenuItem isActive={location.pathname.startsWith("/following")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 width="22" height="22" stroke="currentColor" fill="none" strokeWidth={2}>
                 <path d="M16 14c2.761 0 5 2.239 5 5v1H11v-1c0-2.761 2.239-5 5-5z"/>
                 <circle cx="16" cy="8" r="4"/>
                 <path d="M6 14c2.761 0 5 2.239 5 5v1H1v-1c0-2.761 2.239-5 5-5z"/>
                 <circle cx="6" cy="8" r="4"/>
                 </svg>
                 </MenuItem>
               </TooltipContainer>
              </Link>
              <Link to="/music" style={{ textDecoration: "none" }}>
                <TooltipContainer>
                  <MenuItem isActive={location.pathname === "/music"}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="음악"
                      style={{ overflow: "visible" }}
                    >
                      <path
                        d="M9 19C9 20.6569 7.65685 22 6 22C4.34315 22 3 20.6569 3 19C3 17.3431 4.34315 16 6 16C7.65685 16 9 17.3431 9 19Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M21 17C21 18.6569 19.6569 20 18 20C16.3431 20 15 18.6569 15 17C15 15.3431 16.3431 14 18 14C19.6569 14 21 15.3431 21 17Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M9 19V8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M20.25 11.5C20.25 11.9142 20.5858 12.25 21 12.25C21.4142 12.25 21.75 11.9142 21.75 11.5H20.25ZM21.75 11.5V6H20.25V11.5H21.75Z"
                        fill="currentColor"
                      />
                      <path
                        d="M15.7351 3.75466L11.7351 5.08799C10.4151 5.52801 9.75503 5.74801 9.37752 6.27179C9 6.79556 9 7.49128 9 8.88273V11.9997L21 7.99969V7.54939C21 5.01693 21 3.7507 20.1694 3.15206C19.3388 2.55341 18.1376 2.95383 15.7351 3.75466Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </MenuItem>
                </TooltipContainer>
              </Link>
                          {/* ✅ YouTube 검색 라우트 추가 2025.09.30 추가 */}
              <Link to = "/KategorieScreen" style={{ textDecoration: "none" }}> 
                <TooltipContainer>
                  <MenuItem isActive={location.pathname === "/KategorieScreen"}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-label="YouTube 검색"
                    >
                      <circle cx="11" cy="11" r="7.5" />
                      <path d="m21 21-4.35-4.35" strokeWidth={3} />
                      
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

            <MenuSection>
              <Link to="/station" style={{ textDecoration: "none" }}>
                <TooltipContainer>
                  <MenuItem isActive={location.pathname === "/station"}>
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
                        d="M12 6v6h4.5M19.5 12a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z"
                      />
                    </svg>
                  </MenuItem>
                </TooltipContainer>
              </Link>

              <Link to="/dm" style={{ textDecoration: "none" }}>
                <TooltipContainer>
                  <MenuItem isActive={location.pathname.startsWith("/dm")}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-label="문자"
                    >
                      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 12.5v-6Z" />
                    </svg>
                  </MenuItem>
                </TooltipContainer>
              </Link>

              {/* ✅ 알림: 반드시 페이지 이동 */}
              <Link to="/notification" style={{ textDecoration: "none" }}>
                <TooltipContainer>
                  <MenuItem
                    isActive={location.pathname.startsWith("/notification")}
                  >
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
                    {unread > 0 && (
                      <Badge aria-label={`${unread}개의 새 알림`}>
                        {unread > 99 ? "99+" : unread}
                      </Badge>
                    )}
                  </MenuItem>
                </TooltipContainer>
              </Link>

              <Link to="/settings" style={{ textDecoration: "none" }}>
                <TooltipContainer>
                  <MenuItem
                    isActive={location.pathname.startsWith("/settings")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0  0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0  1 1 2.83-2.83l.06.06c.51.51 1.21.66 1.82.33.6-.34 1-.95 1-1.65V3a2 2 0  1 1 4 0v.09c0 .7.4 1.31 1 1.65.61.33 1.31.18 1.82-.33l.06-.06a2 2 0  1 1 2.83 2.83l-.06.06c-.51.51-.66 1.21-.33 1.82.34.6.95 1 1.65 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.31.4-1.51 1z"></path>
                    </svg>
                  </MenuItem>
                </TooltipContainer>
              </Link>

              <MenuDivider />
            </MenuSection>

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
                      d="M8.25 9V5.25A2.25 2.25 0  0 1 10.5 3h6a2.25 2.25 0  0 1 2.25 2.25v13.5A2.25 2.25 0  0 1 16.5 21h-6a2.25 2.25 0  0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
                    />
                  </svg>
                </MenuItem>
              </TooltipContainer>
            </BottomMenu>
          </Navigator>

          <ContentContainer $isFullscreenMusic={isFullscreenMusic}>
            {!isFullscreenMusic && (
              /** ⬇️ DM 화면이면 $lock=true 로 레이아웃 스크롤 숨김 */
              <MainContent $isFullscreenMusic={isFullscreenMusic} $lock={isDM}>
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

            {/* 음악 플레이어 영역 */}
            <MusicPlayerContainer $isFullscreenMusic={isFullscreenMusic}>
              <FullscreenExitButton
                $isVisible={isFullscreenMusic}
                onClick={exitFullscreen}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </FullscreenExitButton>
              {gradientLayers.map((layer, idx) => (
                <GradientOverlay
                  key={layer.id}
                  className={idx === gradientLayers.length - 1 ? "fading" : ""}
                  color1={layer.color1}
                  color2={layer.color2}
                  $isFullscreenMusic={isFullscreenMusic}
                />
              ))}
              {MemoizedMusicPlayer}
            </MusicPlayerContainer>
          </ContentContainer>
        </Body>

        {/* 이미지 모달 */}
        <ImageModal
          $isOpen={!!imageModalSrc}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeImageModal();
          }}
        >
          <ModalCloseButton $isOpen={!!imageModalSrc} onClick={closeImageModal}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </ModalCloseButton>
          {imageModalSrc && (
            <img
              src={imageModalSrc}
              alt="확대된 이미지"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
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
