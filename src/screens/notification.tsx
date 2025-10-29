// screens/notification.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useTheme } from "../components/ThemeContext";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  onSnapshot,
  query,
  collection,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

type Kind = "mention" | "like" | "system" | "dm" | "follow";
type Item = {
  id: string;
  kind: Kind;
  title: string;
  desc?: string;
  ts: number;
  read?: boolean;
  avatar?: string;
  link?: string;
};

/* ---------- styled-components 그대로 유지 ---------- */
const Wrap = styled.div`
  max-width: 860px;
  margin: 32px auto;
  padding: 0 16px 48px;
  color: var(--text-primary);
`;
const H1 = styled.h1`
  font-size: 24px;
  line-height: 1.2;
  margin: 6px 0 18px;
  color: var(--text-primary);
  letter-spacing: -0.2px;
`;
const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 8px;
  padding: 10px 0 14px;
  margin-bottom: 14px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0)),
    var(--surface);
  backdrop-filter: blur(4px);

  button {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-primary);
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 700;
    font-size: 13px;
    transition: transform 0.06s ease, background 0.12s ease,
      box-shadow 0.12s ease;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);

    &:hover {
      background: var(--hover);
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(0);
    }
    &:focus-visible {
      outline: 3px solid
        color-mix(in oklab, var(--text-primary) 20%, transparent);
      outline-offset: 2px;
    }
  }
`;
const Card = styled.button<{ $unread?: boolean }>`
  --card-bg: ${(p) =>
    p.$unread
      ? "var(--accent-weak-2, rgba(59,130,246,0.08))"
      : "var(--surface)"};
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;

  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 10px;
  align-items: start;

  transition: transform 0.08s ease, background 0.14s ease, box-shadow 0.14s ease,
    border-color 0.14s ease;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);

  ${(p) =>
    p.$unread &&
    `border-left: 3px solid var(--accent, #3b82f6); padding-left: 13px;`}

  &:hover {
    background: color-mix(in oklab, var(--card-bg) 80%, var(--hover));
    transform: translateY(-1px);
    box-shadow: 0 8px 26px rgba(0, 0, 0, 0.08);
  }
  &:active {
    transform: translateY(0);
  }
  &:focus-visible {
    outline: 3px solid
      color-mix(in oklab, var(--accent, #3b82f6) 35%, transparent);
    outline-offset: 2px;
  }
`;
const Left = styled.div`
  position: relative;
  width: 40px;
  height: 40px;
`;
const Avatar = styled.img`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
`;
const AvatarFallback = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  color: var(--text-primary);
  border: 1px solid var(--border);
  background: radial-gradient(
      120% 120% at 0% 0%,
      rgba(99, 102, 241, 0.22),
      transparent 60%
    ),
    radial-gradient(
      120% 120% at 100% 100%,
      rgba(59, 130, 246, 0.18),
      transparent 60%
    ),
    var(--surface);
`;
const UnreadDot = styled.span`
  position: absolute;
  right: -2px;
  top: -2px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--accent, #3b82f6);
  box-shadow: 0 0 0 2px var(--surface);
`;
const Body = styled.div`
  min-width: 0;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;
const Title = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.1px;
`;
const Desc = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const KindBadge = styled.span<{ $kind: Kind }>`
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: ${(p) =>
    p.$kind === "mention"
      ? "rgba(99,102,241,.12)"
      : p.$kind === "like"
      ? "rgba(16,185,129,.10)"
      : p.$kind === "dm"
      ? "rgba(251,146,60,.12)"
      : "rgba(148,163,184,.12)"};
  color: ${(p) =>
    p.$kind === "mention"
      ? "color-mix(in oklab, var(--text-primary) 85%, #6366f1)"
      : p.$kind === "like"
      ? "color-mix(in oklab, var(--text-primary) 85%, #10b981)"
      : p.$kind === "dm"
      ? "color-mix(in oklab, var(--text-primary) 85%, #f59e0b)"
      : "var(--text-tertiary)"};
`;
const Meta = styled.div`
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  padding-left: 8px;
`;
const Empty = styled.div`
  padding: 36px 12px 48px;
  color: var(--text-tertiary);
  border: 1px dashed var(--border);
  border-radius: 16px;
  display: grid;
  place-items: center;
  gap: 10px;

  .emoji {
    font-size: 28px;
    line-height: 1;
    opacity: 0.9;
  }
  .title {
    font-weight: 800;
    color: var(--text-secondary);
  }
  .hint {
    font-size: 12px;
  }
`;

/* util */
const timeAgo = (ts: number) => {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const NotificationsScreen: React.FC = () => {
  const { isDarkMode } = useTheme(); // (유지)
  const navi = useNavigate();

  // 로그인한 사용자 uid 추적
  const [uid, setUid] = useState<string | null>(
    getAuth().currentUser?.uid ?? null
  );
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // Firestore에서 불러온 알림들
  const [items, setItems] = useState<Item[]>([]);

  // Firestore 실시간 구독
  useEffect(() => {
    if (!uid) return;

    // notifications/{uid}/inbox 컬렉션을 ts 최신순으로 보기
    const qRef = query(
      collection(db, "notifications", uid, "inbox"),
      orderBy("ts", "desc")
    );

    const unsub = onSnapshot(qRef, (snap) => {
      const arr: Item[] = snap.docs.map((d) => {
        const x = d.data() as any;

        // ✅ kind 정규화: "comment" → "mention"
        const rawKind: string =
          typeof x?.kind === "string" ? x.kind : "system";
        const kind = (rawKind === "comment" ? "mention" : rawKind) as Kind;

        return {
          id: d.id,
          kind,
          title: typeof x?.title === "string" ? x.title : "",
          desc: typeof x?.desc === "string" ? x.desc : undefined,
          // ✅ Timestamp → number(ms), 비어있으면 임시값
          ts:
            x?.ts?.toMillis?.() ??
            (typeof x?.ts === "number" ? x.ts : Date.now()),
          read: Boolean(x?.read),
          avatar: typeof x?.avatar === "string" ? x.avatar : undefined,
          link: typeof x?.link === "string" ? x.link : undefined,
        };
      });

      // 방어적 재정렬
      arr.sort((a, b) => b.ts - a.ts);

      setItems(arr);
    });

    return () => unsub();
  }, [uid]);

  // 모두 읽음 처리: writeBatch + 호출 시점 리스트 캡처
  const markAll = async () => {
    if (!uid) return;

    const curr = [...items];
    if (curr.length === 0) return;

    // UI 먼저 갱신
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));

    const batch = writeBatch(db);
    for (const it of curr) {
      const ref = doc(db, "notifications", uid, "inbox", it.id);
      batch.update(ref, { read: true });
    }
    try {
      await batch.commit();
    } catch (e) {
      console.error("markAll 실패", e);
    }
  };

  // 모두 지우기: writeBatch + 호출 시점 리스트 캡처
  const clearAll = async () => {
    if (!uid) return;

    const curr = [...items];
    if (curr.length === 0) return;

    // UI 먼저 갱신
    setItems([]);

    const batch = writeBatch(db);
    for (const it of curr) {
      const ref = doc(db, "notifications", uid, "inbox", it.id);
      batch.delete(ref);
    }
    try {
      await batch.commit();
    } catch (e) {
      console.error("clearAll 실패", e);
    }
  };

  // 개별 클릭: 읽음 처리 + 링크 이동
  const onClickItem = async (it: Item) => {
    if (uid) {
      try {
        await updateDoc(doc(db, "notifications", uid, "inbox", it.id), {
          read: true,
        });
      } catch (e) {
        console.error("read 업데이트 실패:", e);
      }
    }

    // UI에도 즉시 반영
    setItems((prev) =>
      prev.map((p) => (p.id === it.id ? { ...p, read: true } : p))
    );

    if (it.link) {
      navi(it.link);
    }
  };

  return (
    <Wrap>
      <H1>알림</H1>

      <Bar>
        <button onClick={markAll}>모두 읽음</button>
        <button onClick={clearAll}>모두 지우기</button>
      </Bar>

      {items.length === 0 ? (
        <Empty>
          <div className="emoji">🔔</div>
          <div className="title">표시할 알림이 없습니다</div>
          <div className="hint">새 활동이 생기면 여기로 모아둘게요.</div>
        </Empty>
      ) : (
        items.map((it) => (
          <Card
            key={it.id}
            $unread={!it.read}
            onClick={() => onClickItem(it)}
            aria-label={`${it.kind} 알림: ${it.title}`}
          >
            <Left>
              {it.avatar ? (
                <Avatar src={it.avatar} alt="" />
              ) : (
                <AvatarFallback aria-hidden>
                  {(it.title || "•").trim()[0]?.toUpperCase()}
                </AvatarFallback>
              )}
              {!it.read && <UnreadDot aria-hidden />}
            </Left>

            <Body>
              <Row>
                <KindBadge $kind={it.kind}>
                  {it.kind === "mention"
                    ? "멘션"
                    : it.kind === "like"
                    ? "좋아요"
                    : it.kind === "dm"
                    ? "DM"
                    : it.kind === "follow"
                    ? "팔로우"
                    : "시스템"}
                </KindBadge>

                <Title>{it.title}</Title>
              </Row>
              {it.desc && <Desc>{it.desc}</Desc>}
            </Body>

            <Meta title={new Date(it.ts).toLocaleString()}>
              {timeAgo(it.ts)}
            </Meta>
          </Card>
        ))
      )}
    </Wrap>
  );
};

export default NotificationsScreen;
