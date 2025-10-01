// src/screens/Settingbutton/settings.tsx
import React, { useEffect, useState } from "react";
import { useTheme } from "../../components/ThemeContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { auth } from "../../firebaseConfig";
import { signOut, deleteUser } from "firebase/auth";

/* ================= Tokens ================= */
const R = { lg: "16px", md: "12px" };
const shadow = {
  cardLight: "0 10px 30px rgba(15,23,42,.10)",
  cardDark: "0 16px 36px rgba(0,0,0,.55)",
  focus: "0 0 0 3px rgba(59,130,246,.20)",
};

/* ================= Layout ================= */
const Page = styled.div<{ $isDark: boolean }>`
  min-height: 100vh;
  background: ${(p) => (p.$isDark ? "#0b0c0e" : "#f6f7fb")};
  color: ${(p) => (p.$isDark ? "#f8fafc" : "#0f172a")};
`;

const Header = styled.header<{ $isDark: boolean }>`
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: saturate(140%) blur(8px);
  background: ${(p) =>
    p.$isDark ? "rgba(11,12,14,.75)" : "rgba(246,247,251,.75)"};
  border-bottom: 1px solid ${(p) => (p.$isDark ? "#1f232a" : "#e5e7eb")};
`;

const HeaderInner = styled.div`
  max-width: 920px;
  margin: 0 auto;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Title = styled.h1<{ $isDark: boolean }>`
  margin: 0;
  font-size: clamp(18px, 2.4vw, 22px);
  font-weight: 800;
  letter-spacing: 0.2px;
  color: ${(p) => (p.$isDark ? "#ffffff" : "#0f172a")};
`;

const Wrapper = styled.main`
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
`;

/* ================= Top Toast ================= */
const dropIn = keyframes`
  from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.98); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
`;
const dropOut = keyframes`
  from { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-8px)  scale(.98); }
`;

const ToastTop = styled.div<{ $isDark: boolean; $leaving: boolean }>`
  position: fixed;
  left: 50%;
  top: 8px; /* 화면 맨 위 */
  transform: translateX(-50%);
  z-index: 80; /* 헤더(z-index:10)보다 위 */
  min-width: 240px;
  max-width: 420px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: ${R.md};
  font-size: 14px;
  line-height: 1.2;
  backdrop-filter: saturate(140%) blur(8px);
  border: 1px solid
    ${(p) => (p.$isDark ? "rgba(163,230,216,.35)" : "rgba(16,185,129,.35)")};
  background: ${(p) =>
    p.$isDark ? "rgba(16,185,129,.14)" : "rgba(16,185,129,.10)"};
  color: ${(p) => (p.$isDark ? "#bbf7d0" : "#065f46")};
  box-shadow: ${(p) => (p.$isDark ? shadow.cardDark : shadow.cardLight)};
  animation: ${(p) => (p.$leaving ? dropOut : dropIn)} 160ms ease forwards;
`;
const ToastText = styled.span`
  flex: 1 1 auto;
`;
const CloseToast = styled.button<{ $isDark: boolean }>`
  border: none;
  background: transparent;
  font-weight: 800;
  cursor: pointer;
  color: ${(p) => (p.$isDark ? "#86efac" : "#047857")};
  padding: 4px 8px;
  border-radius: 8px;
  &:hover {
    background: ${(p) =>
      p.$isDark ? "rgba(22,163,74,0.18)" : "rgba(16,185,129,0.15)"};
  }
`;

/* ================= Sections ================= */
const Section = styled.section<{ $isDark: boolean }>`
  background: ${(p) => (p.$isDark ? "#121417" : "#ffffff")};
  border: 1px solid ${(p) => (p.$isDark ? "#1f232a" : "#e5e7eb")};
  border-radius: ${R.lg};
  box-shadow: ${(p) => (p.$isDark ? shadow.cardDark : shadow.cardLight)};
  overflow: hidden;
`;
const SectionHeader = styled.div<{ $isDark: boolean }>`
  padding: 14px 18px;
  background: ${(p) => (p.$isDark ? "#121417" : "#ffffff")};
  border-bottom: 1px solid ${(p) => (p.$isDark ? "#1f232a" : "#eef2f7")};
  display: flex;
  align-items: center;
  gap: 10px;
`;
const SectionTitle = styled.h2<{ $isDark: boolean }>`
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: ${(p) => (p.$isDark ? "#e5e7eb" : "#0f172a")};
`;
const List = styled.div``;

const ItemLink = styled(Link)<{ $isDark: boolean }>`
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  text-decoration: none;
  color: inherit;
  border-top: 1px solid ${(p) => (p.$isDark ? "#1f232a" : "#f1f5f9")};
  background: ${(p) => (p.$isDark ? "#121417" : "#ffffff")};
  transition: background 0.15s ease, border-color 0.15s ease;
  &:first-child {
    border-top: none;
  }
  &:hover {
    background: ${(p) => (p.$isDark ? "#15181c" : "#f9fafb")};
  }
`;

const ItemButton = styled.button<{ $isDark: boolean; $danger?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  text-align: left;
  border: none;
  cursor: pointer;
  background: ${(p) => (p.$isDark ? "#121417" : "#ffffff")};
  color: ${(p) =>
    p.$danger ? (p.$isDark ? "#fecaca" : "#b91c1c") : "inherit"};
  border-top: 1px solid ${(p) => (p.$isDark ? "#1f232a" : "#f1f5f9")};
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  &:hover {
    background: ${(p) => (p.$isDark ? "#15181c" : "#f9fafb")};
  }
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const ItemTitle = styled.div<{ $isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(p) => (p.$isDark ? "#f3f4f6" : "#0f172a")};
`;
const ItemDesc = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  color: ${(p) => (p.$isDark ? "#9aa4b2" : "#64748b")};
`;
const RightMeta = styled.div<{ $isDark: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${(p) => (p.$isDark ? "#9aa4b2" : "#64748b")};
`;

/* ================= Theme-aware ICONS ================= */
type Hue = "indigo" | "purple" | "amber" | "teal" | "rose" | "red";
type Tone = { fg: string; glow: string; badge: string };

const tone = (dark: boolean, hue: Hue): Tone => {
  const map: Record<Hue, Tone> = {
    indigo: {
      fg: dark ? "#a5b4fc" : "#3b82f6",
      glow: "rgba(99,102,241,.55)",
      badge: "transparent",
    },
    purple: {
      fg: dark ? "#e9d5ff" : "#a855f7",
      glow: "rgba(168,85,247,.55)",
      badge: "transparent",
    },
    amber: {
      fg: dark ? "#fde68a" : "#f59e0b",
      glow: "rgba(245,158,11,.55)",
      badge: "transparent",
    },
    teal: {
      fg: dark ? "#99f6e4" : "#14b8a6",
      glow: "rgba(13,148,136,.55)",
      badge: "transparent",
    },
    rose: {
      fg: dark ? "#fecaca" : "#ef4444",
      glow: "rgba(244,63,94,.58)",
      badge: "transparent",
    },
    red: {
      fg: dark ? "#fca5a5" : "#dc2626",
      glow: "rgba(239,68,68,.6)",
      badge: "transparent",
    },
  };
  return map[hue];
};

type BadgeProps = React.PropsWithChildren<{
  dark?: boolean;
  hue: Hue;
  r?: number;
}>;
const Badge: React.FC<BadgeProps> = ({ dark, hue, r = 6, children }) => {
  const t = tone(!!dark, hue);
  const fid = `glow-${hue}`;
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      {dark && (
        <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor={t.glow}
            floodOpacity="1"
          />
        </filter>
      )}
      <g
        filter={dark ? `url(#${fid})` : undefined}
        stroke={t.fg}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        {children}
      </g>
    </svg>
  );
};

const Chevron = (props: { dark?: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    shapeRendering="geometricPrecision"
  >
    <path
      d="M9 6l6 6-6 6"
      stroke={props.dark ? "#94a3b8" : "#475569"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

const IconProfile = ({ dark }: { dark?: boolean }) => (
  <Badge dark={dark} hue="indigo">
    <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5z" />
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </Badge>
);

const IconAppearance = ({ dark }: { dark?: boolean }) => (
  <Badge dark={dark} hue="purple">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.21 17l.06-.06c.38-.38.5-.94.33-1.82a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.31-.4 1.51-1 .17-.88.05-1.44-.33-1.82l-.06-.06A2 2 0 1 1 7.24 4.21l.06.06c.38.38.94.5 1.82.33.6-.34 1-.95 1-1.65V3a2 2 0 1 1 4 0v.09c0 .7.4 1.31 1 1.65.88.17 1.44.05 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.38.38-.5.94-.33 1.82.2.6.81 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.31.4-1.51 1z" />
  </Badge>
);

const IconBell = ({ dark }: { dark?: boolean }) => (
  <Badge dark={dark} hue="amber">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" />
    <path d="M18 16v-5a6 6 0 10-12 0v5l-1.5 2h15L18 16z" />
  </Badge>
);

const IconEye = ({ dark }: { dark?: boolean }) => (
  <Badge dark={dark} hue="teal">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Badge>
);

const IconShield = ({ dark }: { dark?: boolean }) => (
  <Badge dark={dark} hue="indigo">
    <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
    <path d="M8 12l8-4" />
  </Badge>
);

const IconPower = ({ dark }: { dark?: boolean }) => (
  <Badge dark={dark} hue="red">
    <path d="M12 2v10" />
    <path d="M5.5 5.5a8 8 0 1013 0" />
  </Badge>
);

/* 기존 ThemeToggle 대체 */
const ThemeToggle = styled.button<{ $active: boolean }>`
  position: relative;
  width: 56px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: ${(p) =>
    p.$active
      ? "linear-gradient(135deg,#0ea5e9,#6366f1)"
      : "linear-gradient(135deg,#e2e8f0,#cbd5e1)"};
  cursor: pointer;
  transition: background 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 140ms ease, transform 120ms ease;
  box-shadow: ${(p) => (p.$active ? "0 0 0 3px rgba(99,102,241,.18)" : "none")};
  outline: none;

  &:active {
    transform: scale(0.98);
  }

  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: ${(p) => (p.$active ? "30px" : "3px")};
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    transition: left 240ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 320ms ease;
    transform: ${(p) => (p.$active ? "scale(1.02)" : "scale(1)")};
  }
`;

/* ================= Modal ================= */
const Fade = keyframes`
  from { opacity: 0; } to { opacity: 1; }
`;
const Overlay = styled.div<{ $isDark: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 70;
  background: ${(p) => (p.$isDark ? "rgba(0,0,0,.6)" : "rgba(0,0,0,.45)")};
  animation: ${Fade} 120ms ease;
  display: grid;
  place-items: center;
`;
const Dialog = styled.div<{ $isDark: boolean }>`
  width: min(420px, 92vw);
  border-radius: 16px;
  background: ${(p) => (p.$isDark ? "#111315" : "#ffffff")};
  color: ${(p) => (p.$isDark ? "#f8fafc" : "#0f172a")};
  border: 1px solid ${(p) => (p.$isDark ? "#23262b" : "#e5e7eb")};
  box-shadow: ${(p) =>
    p.$isDark
      ? "0 18px 48px rgba(0,0,0,.55)"
      : "0 18px 48px rgba(15,23,42,.16)"};
  padding: 18px;
`;
const DH2 = styled.h3<{ $isDark: boolean }>`
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  color: ${(p) => (p.$isDark ? "#fee2e2" : "#b91c1c")};
`;
const DText = styled.p<{ $isDark: boolean }>`
  margin: 0 0 12px;
  font-size: 14px;
  color: ${(p) => (p.$isDark ? "#cbd5e1" : "#475569")};
`;
const DInput = styled.input<{ $isDark: boolean }>`
  width: 100%;
  padding: 12px;
  background: ${(p) => (p.$isDark ? "#0f1112" : "#f8fafc")};
  border: 1px solid ${(p) => (p.$isDark ? "#2b3137" : "#e5e7eb")};
  color: inherit;
  border-radius: 12px;
  font-size: 14px;
`;
const DRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
`;
const Ghost = styled.button<{ $isDark: boolean }>`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$isDark ? "#2b3137" : "#e5e7eb")};
  background: transparent;
  cursor: pointer;
  font-weight: 700;
`;
const Danger = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 800;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: white;
`;

/* ================= Component ================= */
const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // 탈퇴 모달 상태
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // notice 처리(프로필/알림/개인정보 저장 등)
  useEffect(() => {
    const state = (location.state || {}) as { notice?: string };
    if (state.notice) {
      setNotice(state.notice);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!notice) return;
    const t1 = setTimeout(() => setLeaving(true), 1800);
    const t2 = setTimeout(() => {
      setLeaving(false);
      setNotice(null);
    }, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [notice]);

  const handleLogout = async () => {
    const ok = window.confirm("로그아웃 하시겠어요?");
    if (!ok) return;

    try {
      if (auth) await signOut(auth);
    } catch (e) {
      console.warn("signOut skipped or failed:", e);
    } finally {
      navigate("/login", {
        replace: true,
        state: { notice: "로그아웃 되었습니다." },
      });
    }
  };

  const handleOpenDelete = () => {
    setConfirmText("");
    setOpenDelete(true);
  };
  const handleCloseDelete = () => setOpenDelete(false);

  const handleDeleteAccount = async () => {
    if (confirmText.trim() !== "탈퇴") {
      alert("확인 문구로 ‘탈퇴’를 입력해주세요.");
      return;
    }
    const user = auth?.currentUser;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      await deleteUser(user);
      navigate("/login", {
        replace: true,
        state: { notice: "계정이 삭제되었습니다." },
      });
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login") {
        navigate("/login", {
          replace: true,
          state: {
            notice:
              "보안을 위해 다시 로그인해주세요. 로그인 후 ‘탈퇴’를 다시 진행할 수 있습니다.",
            after: "/settings",
          },
        });
        return;
      }
      console.error("deleteUser error:", err);
      alert("탈퇴 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setOpenDelete(false);
    }
  };

  return (
    <Page $isDark={isDarkMode}>
      {notice && (
        <ToastTop
          $isDark={isDarkMode}
          $leaving={leaving}
          role="status"
          aria-live="polite"
        >
          <ToastText>✅ {notice}</ToastText>
          <CloseToast
            $isDark={isDarkMode}
            onClick={() => setNotice(null)}
            aria-label="알림 닫기"
          >
            ×
          </CloseToast>
        </ToastTop>
      )}

      <Header $isDark={isDarkMode}>
        <HeaderInner>
          <Title $isDark={isDarkMode}>설정</Title>
        </HeaderInner>
      </Header>

      <Wrapper>
        {/* 프로필 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <IconProfile dark={isDarkMode} />
            <SectionTitle $isDark={isDarkMode}>프로필</SectionTitle>
          </SectionHeader>
          <List>
            <ItemLink
              to="/settings/profile"
              $isDark={isDarkMode}
              aria-label="프로필 변경"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>프로필 변경</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  이름, 사진, 소개, 위치를 수정합니다.
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}>
                <Chevron dark={isDarkMode} />
              </RightMeta>
            </ItemLink>
          </List>
        </Section>

        {/* 모양 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <IconAppearance dark={isDarkMode} />
            <SectionTitle $isDark={isDarkMode}>모양</SectionTitle>
          </SectionHeader>
          <List>
            <ItemLink
              to="#"
              onClick={(e) => e.preventDefault()}
              $isDark={isDarkMode}
              aria-label="테마 변경"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>테마 변경</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  라이트/다크 테마를 전환합니다.
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}>
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {isDarkMode ? "다크" : "라이트"}
                </span>
                <ThemeToggle
                  $active={isDarkMode}
                  onClick={toggleTheme}
                  aria-label="테마 토글"
                />
              </RightMeta>
            </ItemLink>
          </List>
        </Section>

        {/* 알림 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <IconBell dark={isDarkMode} />
            <SectionTitle $isDark={isDarkMode}>알림</SectionTitle>
          </SectionHeader>
          <List>
            <ItemLink
              to="/settings/notifications"
              $isDark={isDarkMode}
              aria-label="알림 설정"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>알림 설정</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  푸시/이메일, 멘션/DM 우선 알림
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}>
                <Chevron dark={isDarkMode} />
              </RightMeta>
            </ItemLink>
          </List>
        </Section>

        {/* 개인정보 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <IconEye dark={isDarkMode} />
            <SectionTitle $isDark={isDarkMode}>개인정보</SectionTitle>
          </SectionHeader>
          <List>
            <ItemLink
              to="/settings/privacy"
              $isDark={isDarkMode}
              aria-label="개인정보 설정"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>개인정보 설정</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  공개 범위 / 온라인 표시
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}>
                <Chevron dark={isDarkMode} />
              </RightMeta>
            </ItemLink>
          </List>
        </Section>

        {/* 안전 및 블록 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <IconShield dark={isDarkMode} />
            <SectionTitle $isDark={isDarkMode}>안전 및 블록</SectionTitle>
          </SectionHeader>
          <List>
            <ItemLink
              to="/settings/block"
              $isDark={isDarkMode}
              aria-label="차단 관리"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>차단</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  차단한 사용자를 확인하고 해제합니다.
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}>
                <Chevron dark={isDarkMode} />
              </RightMeta>
            </ItemLink>
          </List>
        </Section>

        {/* 계정(로그아웃/탈퇴) */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <IconPower dark={isDarkMode} />
            <SectionTitle $isDark={isDarkMode}>계정</SectionTitle>
          </SectionHeader>
          <List>
            <ItemButton
              $isDark={isDarkMode}
              onClick={handleLogout}
              aria-label="로그아웃"
              title="로그아웃"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>로그아웃</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  현재 계정에서 로그아웃합니다.
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}></RightMeta>
            </ItemButton>

            <ItemButton
              $isDark={isDarkMode}
              $danger
              onClick={handleOpenDelete}
              aria-label="계정 탈퇴"
              title="계정 탈퇴"
            >
              <div />
              <div>
                <ItemRow>
                  <ItemTitle $isDark={isDarkMode}>탈퇴</ItemTitle>
                </ItemRow>
                <ItemDesc $isDark={isDarkMode}>
                  계정과 관련 데이터를 삭제합니다. 되돌릴 수 없습니다.
                </ItemDesc>
              </div>
              <RightMeta $isDark={isDarkMode}></RightMeta>
            </ItemButton>
          </List>
        </Section>
      </Wrapper>

      {/* 탈퇴 확인 모달 */}
      {openDelete && (
        <Overlay
          $isDark={isDarkMode}
          role="dialog"
          aria-modal="true"
          aria-label="계정 탈퇴 확인"
        >
          <Dialog $isDark={isDarkMode}>
            <DH2 $isDark={isDarkMode}>정말 탈퇴하시겠어요?</DH2>
            <DText $isDark={isDarkMode}>
              이 작업은 되돌릴 수 없습니다. 계속하려면 <b>탈퇴</b> 를
              입력하세요.
            </DText>
            <DInput
              $isDark={isDarkMode}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="탈퇴"
            />
            <DRow>
              <Ghost $isDark={isDarkMode} onClick={handleCloseDelete}>
                취소
              </Ghost>
              <Danger onClick={handleDeleteAccount}>영구 삭제</Danger>
            </DRow>
          </Dialog>
        </Overlay>
      )}
    </Page>
  );
};

export default Settings;
