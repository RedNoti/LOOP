// screens/notification.tsx
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { useTheme } from "../components/ThemeContext";
import { useNavigate } from "react-router-dom";

type Kind = "mention" | "like" | "system";
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

const Wrap = styled.div`
  max-width: 860px;
  margin: 32px auto;
  padding: 0 16px 48px;
  color: var(--text-primary);
`;

const H1 = styled.h1`
  font-size: 22px;
  margin: 6px 0 18px;
  color: var(--text-primary);
`;

const Bar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  button {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-primary);
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }
  button:hover {
    background: var(--hover);
  }
`;

const Card = styled.button<{ $unread?: boolean }>`
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--border);
  background: ${(p) => (p.$unread ? "var(--accent-weak-2)" : "var(--surface)")};
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 10px;
  align-items: start;
  &:hover {
    background: var(--hover);
  }
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
`;

const Desc = styled.div`
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-secondary);
`;

const Meta = styled.div`
  font-size: 12px;
  color: var(--text-tertiary);
`;

const timeAgo = (ts: number) => {
  const diff = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const NotificationsScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navi = useNavigate();

  const seed: Item[] = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: "p1",
        kind: "mention",
        title: "박경훈 님이 당신을 언급했습니다",
        desc: "DM: 디자인 리뷰 가능할까요?",
        ts: now - 40_000,
        read: false,
        avatar: "/default-avatar.png",
        link: "/dm",
      },
      {
        id: "p2",
        kind: "like",
        title: "게시글에 새 좋아요 5개",
        desc: "프로필 활동 업데이트",
        ts: now - 3_600_000,
        read: false,
        avatar: "/uplogo.png",
        link: "/",
      },
      {
        id: "p3",
        kind: "system",
        title: "비밀번호 변경 알림",
        desc: "최근 보안 설정이 업데이트됨",
        ts: now - 86_400_000,
        read: true,
      },
    ];
  }, []);
  const [items, setItems] = useState<Item[]>(seed);

  const markAll = () =>
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
  const clearAll = () => setItems([]);

  const onClickItem = (it: Item) => {
    setItems((prev) =>
      prev.map((p) => (p.id === it.id ? { ...p, read: true } : p))
    );
    if (it.link) navi(it.link);
  };

  return (
    <Wrap>
      <H1>알림</H1>
      <Bar>
        <button onClick={markAll}>모두 읽음</button>
        <button onClick={clearAll}>모두 지우기</button>
      </Bar>

      {items.length === 0 ? (
        <div style={{ padding: "24px 8px", color: "var(--text-tertiary)" }}>
          표시할 알림이 없습니다.
        </div>
      ) : (
        items.map((it) => (
          <Card key={it.id} $unread={!it.read} onClick={() => onClickItem(it)}>
            {it.avatar ? <Avatar src={it.avatar} alt="" /> : <div />}
            <div>
              <Title>{it.title}</Title>
              {it.desc && <Desc>{it.desc}</Desc>}
            </div>
            <Meta>{timeAgo(it.ts)}</Meta>
          </Card>
        ))
      )}
    </Wrap>
  );
};

export default NotificationsScreen;
