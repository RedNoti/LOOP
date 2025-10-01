// src/screens/Settingbutton/BlockSettings.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useTheme } from "../../components/ThemeContext";
import { useRelations } from "../../components/RelationsContext";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface ProfileData {
  uid: string;
  name: string;
  photoUrl: string;
}

/* ========== tokens ========== */
const shadows = {
  cardLight: "0 6px 18px rgba(15,23,42,.08)",
  cardDark: "0 10px 28px rgba(0,0,0,.48)",
};

/* ========== styled ========== */
const Page = styled.div<{ $isDark: boolean }>`
  /* 파랑 포인트 컬러 (한 곳에서 관리) */
  --accent-1: #2563eb; /* primary */
  --accent-2: #60a5fa; /* light */
  --focus-ring: rgba(37, 99, 235, 0.35);

  min-height: 100vh;
  padding: 28px clamp(16px, 4vw, 32px);
  background: ${(p) => (p.$isDark ? "#0b0c0e" : "#f6f7fb")};
  color: ${(p) => (p.$isDark ? "#f5f7fa" : "#101418")};
  transition: background 0.25s ease;
`;

const HeaderRow = styled.div<{ $isDark: boolean }>`
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 12px 0 16px;
  background: ${(p) => (p.$isDark ? "#0b0c0e" : "#f6f7fb")};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const TitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const H2 = styled.h2<{ $isDark: boolean }>`
  margin: 0;
  font-size: clamp(18px, 2.2vw, 22px);
  font-weight: 800;
  letter-spacing: 0.2px;
  color: ${(p) => (p.$isDark ? "#ffffff" : "#111827")};
`;

const CountPill = styled.span<{ $isDark: boolean }>`
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${(p) => (p.$isDark ? "#cbd5e1" : "#475569")};
  background: ${(p) => (p.$isDark ? "rgba(148,163,184,.12)" : "#eef2f7")};
  border: 1px solid ${(p) => (p.$isDark ? "rgba(148,163,184,.22)" : "#e5eaf2")};
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SearchWrap = styled.label<{ $isDark: boolean }>`
  position: relative;
  width: 100%;
  max-width: 340px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: ${(p) => (p.$isDark ? "#9aa4b2" : "#90a0b7")};
    pointer-events: none;
  }
`;

const SearchInput = styled.input<{ $isDark: boolean }>`
  width: 100%;
  height: 42px; /* 버튼과 동일 높이 */
  padding: 0 36px 0 38px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.$isDark ? "#24272b" : "#e5e7eb")};
  background: ${(p) => (p.$isDark ? "#111315" : "#ffffff")};
  color: ${(p) => (p.$isDark ? "#e5e7eb" : "#111827")};
  font-size: 14px;
  box-shadow: ${(p) =>
    p.$isDark ? "inset 0 0 0 9999px rgba(255,255,255,0.02)" : "none"};
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: ${(p) => (p.$isDark ? "#6b7280" : "#94a3b8")};
  }
  &:focus {
    outline: none;
    border-color: var(--accent-1);
    box-shadow: 0 0 0 3px var(--focus-ring);
  }
`;

const ClearBtn = styled.button<{ $isDark: boolean }>`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  color: ${(p) => (p.$isDark ? "#9aa4b2" : "#64748b")};
  &:hover {
    color: ${(p) => (p.$isDark ? "#e2e8f0" : "#334155")};
  }
`;

const Grid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
`;

const Card = styled.article<{ $isDark: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 16px;
  background: ${(p) => (p.$isDark ? "rgba(22,24,27,.8)" : "#ffffff")};
  border: 1px solid ${(p) => (p.$isDark ? "#23262b" : "#e5e7eb")};
  box-shadow: ${(p) => (p.$isDark ? shadows.cardDark : shadows.cardLight)};
  backdrop-filter: ${(p) => (p.$isDark ? "saturate(120%) blur(4px)" : "none")};
  transition: transform 0.12s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${(p) => (p.$isDark ? "#2c3137" : "#dde3ea")};
  }
`;

const AvatarWrap = styled.div<{ $isDark: boolean }>`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  padding: 2px;
  background: ${(p) =>
    p.$isDark
      ? "linear-gradient(135deg,#2b2f35,var(--accent-1))"
      : "linear-gradient(135deg,#e2e8f0,var(--accent-2))"};
`;

const Avatar = styled.img<{ $isDark: boolean }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${(p) => (p.$isDark ? "#0b0c0e" : "#ffffff")};
  background: ${(p) => (p.$isDark ? "#0f1112" : "#f8fafc")};
`;

const Info = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Name = styled.div<{ $isDark: boolean }>`
  font-weight: 700;
  font-size: 15px;
  color: ${(p) => (p.$isDark ? "#f3f4f6" : "#0f172a")};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Sub = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  color: ${(p) => (p.$isDark ? "#9aa4b2" : "#6b7280")};
`;

/* 기존 DangerBtn을 파랑 포인트의 'Primary' 스타일로 변경 */
const DangerBtn = styled.button<{ $isDark: boolean }>`
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.$isDark ? "#2b3137" : "#e5e7eb")};
  background: transparent;
  color: var(--accent-1);
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${(p) => (p.$isDark ? "rgba(59,130,246,.10)" : "#eff6ff")};
    border-color: ${(p) => (p.$isDark ? "#3451a0" : "#bfdbfe")};
  }
  &:active {
    transform: translateY(1px);
  }
`;

/* 헤더에서도 카드와 '같은 한 줄 버튼'을 쓰기 위해 DangerBtn 재사용 */
const HeaderDangerBtn = styled(DangerBtn)<{ $isDark: boolean }>`
  height: 42px; /* 검색창과 동일 높이 */
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap; /* 줄바꿈 방지 */
`;

const Empty = styled.div<{ $isDark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  height: 42vh;
  border: 1px dashed ${(p) => (p.$isDark ? "#2b2f35" : "#dbe3ee")};
  border-radius: 16px;
  background: ${(p) => (p.$isDark ? "rgba(16,18,20,.6)" : "#ffffff")};
  color: ${(p) => (p.$isDark ? "#a7b0bb" : "#6b7280")};
  font-size: 14px;
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Skeleton = styled.div<{ $isDark: boolean }>`
  height: 76px;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    ${(p) => (p.$isDark ? "#17181b" : "#eef2f7")} 25%,
    ${(p) => (p.$isDark ? "#1f2126" : "#f6f7fb")} 37%,
    ${(p) => (p.$isDark ? "#17181b" : "#eef2f7")} 63%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.6s infinite;
  border: 1px solid ${(p) => (p.$isDark ? "#23262b" : "#e5e7eb")};
`;

/* ========== component ========== */
const BlockSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { unmute, loading } = useRelations();

  const [blockedUsers, setBlockedUsers] = useState<ProfileData[]>([]);
  const [query, setQuery] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const run = async () => {
      const me = auth.currentUser?.uid;
      if (!me) {
        setInitialLoading(false);
        return;
      }

      const relRef = doc(db, "user_relations", me);
      const relSnap = await getDoc(relRef);
      if (!relSnap.exists()) {
        setBlockedUsers([]);
        setInitialLoading(false);
        return;
      }

      const muted: string[] = (relSnap.data().muted || []) as string[];
      const users = await Promise.all(
        muted.map(async (uid) => {
          const pSnap = await getDoc(doc(db, "profiles", uid));
          if (!pSnap.exists()) return null;
          const p = pSnap.data() || {};
          return {
            uid,
            name: (p as any).name || "알 수 없음",
            photoUrl:
              (p as any).photoUrl ||
              "https://via.placeholder.com/100?text=No+Image",
          } as ProfileData;
        })
      );

      setBlockedUsers(users.filter(Boolean) as ProfileData[]);
      setInitialLoading(false);
    };
    run();
  }, [loading]);

  const filtered = useMemo(
    () =>
      blockedUsers.filter((u) =>
        u.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [blockedUsers, query]
  );

  const handleUnblock = async (uid: string) => {
    const ok = window.confirm("해당 사용자의 차단을 해제할까요?");
    if (!ok) return;
    await unmute(uid);
    setBlockedUsers((prev) => prev.filter((u) => u.uid !== uid));
  };

  const handleUnblockAll = async () => {
    if (blockedUsers.length === 0) return;
    const ok = window.confirm(
      `총 ${blockedUsers.length}명을 모두 차단 해제할까요?`
    );
    if (!ok) return;
    for (const u of blockedUsers) {
      // eslint-disable-next-line no-await-in-loop
      await unmute(u.uid);
    }
    setBlockedUsers([]);
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const bulkLabel = blockedUsers.length <= 1 ? "해제" : "전체 해제";

  return (
    <Page $isDark={isDarkMode}>
      <HeaderRow $isDark={isDarkMode}>
        <TitleWrap>
          <H2 $isDark={isDarkMode}>차단된 사용자</H2>
          <CountPill $isDark={isDarkMode}>총 {blockedUsers.length}명</CountPill>
        </TitleWrap>

        <Controls>
          <SearchWrap $isDark={isDarkMode} aria-label="사용자 검색">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M10 4a6 6 0 104.472 10.056l4.736 4.736 1.414-1.414-4.736-4.736A6 6 0 0010 4zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" />
            </svg>
            <SearchInput
              ref={inputRef}
              $isDark={isDarkMode}
              placeholder="사용자 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <ClearBtn
                $isDark={isDarkMode}
                onClick={clearSearch}
                aria-label="검색 지우기"
              >
                ✕
              </ClearBtn>
            )}
          </SearchWrap>

          {blockedUsers.length > 0 && (
            <HeaderDangerBtn
              $isDark={isDarkMode}
              onClick={handleUnblockAll}
              aria-label="차단 사용자 전체 해제"
            >
              {bulkLabel}
            </HeaderDangerBtn>
          )}
        </Controls>
      </HeaderRow>

      {/* content */}
      {initialLoading ? (
        <Grid>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} $isDark={isDarkMode} />
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Empty $isDark={isDarkMode}>
          <div style={{ fontSize: 28 }}>🧹</div>
          {query ? (
            <>
              <div>검색 결과가 없습니다.</div>
              <HeaderDangerBtn $isDark={isDarkMode} onClick={clearSearch}>
                검색 초기화
              </HeaderDangerBtn>
            </>
          ) : (
            <>
              <div>현재 차단한 사용자가 없습니다.</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                이 화면에서 관리 기능을 나중에 다시 확인할 수 있어요.
              </div>
            </>
          )}
        </Empty>
      ) : (
        <Grid>
          {filtered.map((u) => (
            <Card
              key={u.uid}
              $isDark={isDarkMode}
              aria-label={`${u.name} 카드`}
            >
              <AvatarWrap $isDark={isDarkMode}>
                <Avatar
                  $isDark={isDarkMode}
                  src={u.photoUrl}
                  alt={u.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/100?text=No+Image";
                  }}
                />
              </AvatarWrap>
              <Info>
                <Name $isDark={isDarkMode}>{u.name}</Name>
                <Sub $isDark={isDarkMode}>{u.uid}</Sub>
              </Info>
              <DangerBtn
                $isDark={isDarkMode}
                onClick={() => handleUnblock(u.uid)}
              >
                차단 해제
              </DangerBtn>
            </Card>
          ))}
        </Grid>
      )}
    </Page>
  );
};

export default BlockSettings;
