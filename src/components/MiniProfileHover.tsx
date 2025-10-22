// src/components/MiniProfileHover.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "./ThemeContext";

type Profile = {
  name?: string;
  email?: string;
  photoUrl?: string;
  bio?: string;
  location?: string;
};

type Props = {
  userId: string;
  children: React.ReactNode; // 아바타(프로필 이미지)나 감쌀 대상
  // 옵션
  openDelayMs?: number;
  closeDelayMs?: number;
  // 카드 위치 오프셋
  offsetX?: number;
  offsetY?: number;
};

const Wrapper = styled.span`
  position: relative; /* 기준 컨테이너 */
  display: inline-flex;
`;

const pop = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
`;

const Card = styled.div<{ $isDark: boolean }>`
  position: absolute;
  top: 0;
  left: 56px; /* 아바타 오른쪽에 기본 표시 */
  z-index: 10000;
  min-width: 260px;
  max-width: 320px;
  border-radius: 14px;
  background: ${(p) => (p.$isDark ? "#202020" : "#ffffff")};
  color: ${(p) => (p.$isDark ? "#ffffff" : "#1a1a1a")};
  border: 1px solid ${(p) => (p.$isDark ? "#404040" : "#f0f0f0")};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  padding: 14px;
  transform-origin: left top;
  animation: ${pop} 120ms ease-out;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  align-items: center;
`;

const Avatar = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  background: #ededed;
`;

const Name = styled.div<{ $isDark: boolean }>`
  font-weight: 700;
  font-size: 16px;
  color: ${(p) => (p.$isDark ? "#fff" : "#1a1a1a")};
  margin-bottom: 4px;
`;

const Sub = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  color: ${(p) => (p.$isDark ? "#cccccc" : "#6c757d")};
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Bio = styled.div<{ $isDark: boolean }>`
  margin-top: 10px;
  font-size: 13px;
  color: ${(p) => (p.$isDark ? "#e6e6e6" : "#343a40")};
  line-height: 1.35;
  max-height: 3.6em; /* 2~3줄 정도 */
  overflow: hidden;
`;

const Divider = styled.div<{ $isDark: boolean }>`
  height: 1px;
  background: ${(p) => (p.$isDark ? "#404040" : "#f0f0f0")};
  margin: 12px 0;
`;

const Footer = styled.div<{ $isDark: boolean }>`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

/** 표시용 배지(동작 없음) */
const GhostBtn = styled.span<{ $isDark: boolean }>`
  padding: 8px 12px;
  font-size: 12px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$isDark ? "#555" : "#e9ecef")};
  background: ${(p) => (p.$isDark ? "#2a2a2a" : "#fafafa")};
  color: ${(p) => (p.$isDark ? "#fff" : "#1a1a1a")};
  cursor: default;
`;

// 간단 캐시 (세션 단위)
const cache = new Map<string, Profile>();

export default function MiniProfileHover({
  userId,
  children,
  openDelayMs = 120,
  closeDelayMs = 180,
  offsetX = 8,
  offsetY = 0,
}: Props) {
  const { isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // 프로필 fetch
  const load = async () => {
    if (cache.has(userId)) {
      setProfile(cache.get(userId)!);
      return;
    }
    try {
      const snap = await getDoc(doc(db, "profiles", userId));
      const data = snap.exists() ? (snap.data() as Profile) : {};
      cache.set(userId, data);
      setProfile(data);
    } catch (e) {
      console.error("MiniProfile fetch error", e);
      setProfile({});
    }
  };

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const show = () => {
    clearTimers();
    openTimer.current = window.setTimeout(async () => {
      await load();
      setOpen(true);
    }, openDelayMs);
  };

  const hide = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, closeDelayMs);
  };

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  // 위치 보정 (작은 오프셋 지원) - 메모
  const cardStyle = useMemo<React.CSSProperties>(
    () => ({
      left: `calc(56px + ${offsetX}px)`,
      top: `${offsetY}px`,
    }),
    [offsetX, offsetY]
  );

  return (
    <Wrapper onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}

      {open && (
        <Card
          $isDark={isDarkMode}
          style={cardStyle}
          onMouseEnter={() => {
            // 카드 위로 들어오면 닫힘 예약 취소
            if (closeTimer.current) {
              window.clearTimeout(closeTimer.current);
              closeTimer.current = null;
            }
          }}
          onMouseLeave={hide}
        >
          <Row>
            <Avatar
              src={
                profile?.photoUrl ||
                "/default_profile.png" /* 프로젝트 내 기본 이미지 경로 */
              }
              alt="profile"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null; // 무한루프 방지
                img.src = "/default_profile.png";
              }}
            />
            <div>
              <Name $isDark={isDarkMode}>{profile?.name || "이름 미설정"}</Name>
              <Sub $isDark={isDarkMode}>
                {profile?.email && <span>{profile.email}</span>}
                {profile?.location && <span>• {profile.location}</span>}
              </Sub>
            </div>
          </Row>

          {(profile?.bio || "").trim() && (
            <>
              <Divider $isDark={isDarkMode} />
              <Bio $isDark={isDarkMode}>{profile?.bio}</Bio>
            </>
          )}

          {/* 기능 확장 자리: 추후 팔로우/메시지 등 */}
          <Footer $isDark={isDarkMode}>
            <GhostBtn $isDark={isDarkMode}>프로필</GhostBtn>
          </Footer>
        </Card>
      )}
    </Wrapper>
  );
}
