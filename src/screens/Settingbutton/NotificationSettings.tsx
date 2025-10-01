// src/screens/Settingbutton/NotificationSettings.tsx
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../components/ThemeContext";

/* ============== tokens (Settings 스타일과 톤 맞춤) ============== */
const R = { lg: "16px", md: "12px" };
const shadow = {
  cardLight: "0 10px 30px rgba(15,23,42,.10)",
  cardDark: "0 16px 36px rgba(0,0,0,.55)",
};

/* ---- 색 팔레트: 다크 대비 강화 ---- */
const dark = {
  bg: "#0b0c0e",
  panel: "#111315",
  panelAlt: "#121417",
  text: "#e5e7eb",
  sub: "#cbd5e1",
  border: "#2a2f36",
  borderSoft: "#1f232a",
  headerGlass: "rgba(11,12,14,.75)",
};

/* ============== layout ============== */
const Page = styled.div<{ $isDark: boolean }>`
  min-height: 100vh;
  background: ${(p) => (p.$isDark ? dark.bg : "#f6f7fb")};
  color: ${(p) => (p.$isDark ? dark.text : "#0f172a")};
`;

const Header = styled.header<{ $isDark: boolean }>`
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: saturate(140%) blur(8px);
  background: ${(p) =>
    p.$isDark ? dark.headerGlass : "rgba(246,247,251,.75)"};
  border-bottom: 1px solid ${(p) => (p.$isDark ? dark.border : "#e5e7eb")};
`;

const HeaderInner = styled.div`
  max-width: 920px;
  margin: 0 auto;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h1<{ $isDark: boolean }>`
  margin: 0;
  font-size: clamp(18px, 2.4vw, 22px);
  font-weight: 800;
  letter-spacing: 0.2px;
  color: ${(p) => (p.$isDark ? "#ffffff" : "#0f172a")};
`;

const Spacer = styled.div`
  flex: 1 1 auto;
`;

const Wrapper = styled.main`
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
`;

const Section = styled.section<{ $isDark: boolean }>`
  background: ${(p) => (p.$isDark ? dark.panel : "#ffffff")};
  border: 1px solid ${(p) => (p.$isDark ? dark.border : "#e5e7eb")};
  border-radius: ${R.lg};
  box-shadow: ${(p) => (p.$isDark ? shadow.cardDark : shadow.cardLight)};
  overflow: hidden;
`;

const SectionHeader = styled.div<{ $isDark: boolean }>`
  padding: 14px 18px;
  background: ${(p) => (p.$isDark ? dark.panelAlt : "#ffffff")};
  border-bottom: 1px solid ${(p) => (p.$isDark ? dark.borderSoft : "#eef2f7")};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SectionTitle = styled.h2<{ $isDark: boolean }>`
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: ${(p) => (p.$isDark ? dark.text : "#0f172a")};
`;

const Row = styled.div<{ $isDark: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid ${(p) => (p.$isDark ? dark.borderSoft : "#f1f5f9")};
  &:first-child {
    border-top: none;
  }
`;

const Label = styled.div<{ $isDark: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  & > b {
    font-size: 14px;
    color: ${(p) => (p.$isDark ? dark.text : "#0f172a")};
  }
  & > span {
    font-size: 12px;
    color: ${(p) => (p.$isDark ? dark.sub : "#64748b")};
  }
`;

/* switch */
const Switch = styled.button<{ $on: boolean }>`
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: ${(p) =>
    p.$on
      ? "linear-gradient(135deg,#22c55e,#16a34a)"
      : "linear-gradient(135deg,#e2e8f0,#cbd5e1)"};
  cursor: pointer;
  outline: none;
  transition: background 200ms ease, box-shadow 120ms ease;
  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
  }
  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: ${(p) => (p.$on ? "27px" : "3px")};
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    transition: left 200ms ease;
  }
`;

const Select = styled.select<{ $isDark: boolean }>`
  height: 32px;
  border-radius: 10px;
  padding: 0 10px;
  border: 1px solid ${(p) => (p.$isDark ? dark.border : "#e5e7eb")};
  background: ${(p) => (p.$isDark ? "#0f1112" : "#ffffff")};
  color: ${(p) => (p.$isDark ? dark.text : "#0f172a")};
  appearance: none;
  &:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.35);
    outline-offset: 2px;
  }
  option {
    background: ${(p) => (p.$isDark ? "#0f1112" : "#ffffff")};
    color: ${(p) => (p.$isDark ? dark.text : "#0f172a")};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 18px;
`;

const Ghost = styled.button<{ $isDark: boolean }>`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$isDark ? dark.border : "#e5e7eb")};
  background: transparent;
  cursor: pointer;
  font-weight: 700;
  color: ${(p) => (p.$isDark ? dark.text : "#0f172a")};
  &:hover {
    background: ${(p) => (p.$isDark ? "#15181c" : "#f9fafb")};
  }
  &:focus-visible {
    outline: 3px solid rgba(59, 130, 246, 0.35);
    outline-offset: 2px;
  }
`;

const Primary = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 800;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: white;
`;

/* ===== 상단 토스트 (헤더보다 위) ===== */
const dropIn = keyframes`
  from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.98); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
`;
const dropOut = keyframes`
  from { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-8px)  scale(.98); }
`;

const Toast = styled.div<{ $isDark: boolean; $leaving: boolean }>`
  position: fixed;
  left: 50%;
  top: 8px; /* ✅ 화면 맨 위 */
  transform: translateX(-50%);
  z-index: 80; /* ✅ 헤더(z-index:10)보다 위 */
  min-width: 240px;
  max-width: 420px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: ${R.md};
  font-size: 14px;
  line-height: 1.2;
  backdrop-filter: saturate(140%) blur(8px);
  border: 1px solid
    ${(p) => (p.$isDark ? "rgba(147,197,253,.35)" : "rgba(59,130,246,.35)")};
  background: ${(p) =>
    p.$isDark ? "rgba(59,130,246,.14)" : "rgba(59,130,246,.10)"};
  color: ${(p) => (p.$isDark ? "#bfdbfe" : "#1d4ed8")};
  box-shadow: ${(p) => (p.$isDark ? shadow.cardDark : shadow.cardLight)};
  animation: ${(p) => (p.$leaving ? dropOut : dropIn)} 160ms ease forwards;
`;

type NotiSettings = {
  push: boolean;
  email: boolean;
  priority: "mentions" | "dm" | "all";
  sound: boolean;
};

const LS_KEY = "notif_settings";

const NotificationSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const nav = useNavigate();

  /* 상태 */
  const [cfg, setCfg] = useState<NotiSettings>(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw)
      return { push: false, email: true, priority: "mentions", sound: true };
    try {
      return JSON.parse(raw) as NotiSettings;
    } catch {
      return { push: false, email: true, priority: "mentions", sound: true };
    }
  });

  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(() => {
      setLeaving(false);
      setToast(null);
    }, 1950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast]);

  /* 브라우저 푸시 권한 요청 */
  const askPermission = async () => {
    if (!("Notification" in window)) {
      setToast("이 브라우저는 푸시 알림을 지원하지 않아요.");
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      setToast("브라우저 설정에서 알림 권한을 허용해주세요.");
      return false;
    }
    const res = await Notification.requestPermission();
    return res === "granted";
  };

  const onTogglePush = async () => {
    if (!cfg.push) {
      const ok = await askPermission();
      if (!ok) return;
    }
    setCfg((c) => ({ ...c, push: !c.push }));
  };

  // 저장 후 /settings로 이동 + 상단 토스트 노출(상위 settings.tsx가 표시)
  const onSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    nav("/settings", { replace: true, state: { notice: "저장되었습니다." } });
  };

  /* 미리듣기: Web Audio 비프음 */
  const previewBeep = () => {
    if (!cfg.sound) {
      setToast("‘알림 소리’가 꺼져 있어요.");
      return;
    }
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.001;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.26);
  };

  const testBrowserNotification = () => {
    if (!("Notification" in window)) {
      setToast("이 브라우저는 푸시 알림을 지원하지 않아요.");
      return;
    }
    if (Notification.permission !== "granted") {
      setToast("브라우저 알림 권한을 먼저 허용해주세요.");
      return;
    }
    new Notification("테스트 알림", {
      body: "여기서 알림 미리보기!",
      silent: !cfg.sound,
    });
  };

  return (
    <Page $isDark={isDarkMode}>
      {toast && (
        <Toast $isDark={isDarkMode} $leaving={leaving}>
          ✅ {toast}
        </Toast>
      )}

      <Header $isDark={isDarkMode}>
        <HeaderInner>
          <Title $isDark={isDarkMode}>알림 설정</Title>
          <Spacer />
        </HeaderInner>
      </Header>

      <Wrapper>
        {/* 기본 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <SectionTitle $isDark={isDarkMode}>기본</SectionTitle>
          </SectionHeader>

          <Row $isDark={isDarkMode}>
            <Label $isDark={isDarkMode}>
              <b>푸시 알림</b>
              <span>브라우저/앱에서 푸시를 수신합니다.</span>
            </Label>
            <Switch
              $on={!!cfg.push}
              onClick={onTogglePush}
              aria-label="푸시 알림 토글"
            />
          </Row>

          <Row $isDark={isDarkMode}>
            <Label $isDark={isDarkMode}>
              <b>이메일 알림</b>
              <span>중요 활동을 이메일로 받기</span>
            </Label>
            <Switch
              $on={!!cfg.email}
              onClick={() => setCfg((c) => ({ ...c, email: !c.email }))}
              aria-label="이메일 알림 토글"
            />
          </Row>

          <Row $isDark={isDarkMode}>
            <Label $isDark={isDarkMode}>
              <b>우선 알림</b>
              <span>어떤 이벤트를 우선적으로 알릴지 선택</span>
            </Label>
            <Select
              $isDark={isDarkMode}
              value={cfg.priority}
              onChange={(e) =>
                setCfg((c) => ({
                  ...c,
                  priority: e.target.value as NotiSettings["priority"],
                }))
              }
              aria-label="우선 알림 선택"
            >
              <option value="mentions">멘션 우선</option>
              <option value="dm">DM 우선</option>
              <option value="all">전체</option>
            </Select>
          </Row>
        </Section>

        {/* 사운드 & 테스트 */}
        <Section $isDark={isDarkMode}>
          <SectionHeader $isDark={isDarkMode}>
            <SectionTitle $isDark={isDarkMode}>사운드 & 테스트</SectionTitle>
          </SectionHeader>

          <Row $isDark={isDarkMode}>
            <Label $isDark={isDarkMode}>
              <b>알림 소리</b>
              <span>새 알림 도착 시 효과음</span>
            </Label>
            <Switch
              $on={!!cfg.sound}
              onClick={() => setCfg((c) => ({ ...c, sound: !c.sound }))}
              aria-label="알림 소리 토글"
            />
          </Row>

          <Actions>
            <Ghost $isDark={isDarkMode} onClick={previewBeep}>
              소리 미리듣기
            </Ghost>
            <Primary onClick={testBrowserNotification}>
              브라우저 알림 테스트
            </Primary>
          </Actions>
        </Section>

        {/* 저장 */}
        <Section $isDark={isDarkMode}>
          <Actions>
            <Ghost $isDark={isDarkMode} onClick={() => nav("/settings")}>
              취소
            </Ghost>
            <Primary onClick={onSave}>저장</Primary>
          </Actions>
        </Section>
      </Wrapper>
    </Page>
  );
};

export default NotificationSettings;
