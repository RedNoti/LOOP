// src/screens/dm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useTheme } from "../components/ThemeContext";
import { useNavigate } from "react-router-dom";

/* ---------- Types ---------- */
type DmUser = { id: string; name: string; avatar?: string; unread?: number };
type DmMessage = {
  id: string;
  userId: string; // 상대 id 또는 "me"
  text?: string; // 텍스트는 선택
  imageUrl?: string; // 이미지(Base64 data URL)
  ts: number;
  mine?: boolean;
};

/* ---------- LocalStorage Keys ---------- */
const LS_USERS = "dm_mock_users";
const LS_MESSAGES = "dm_mock_messages";
const AVATAR_FALLBACK = "/default-avatar.png";

/* ---------- Layout ---------- */
const LEFT_WIDTH = 260;

const Page = styled.div<{ $dark: boolean }>`
  height: calc(100vh - 70px);
  min-height: 0;
  display: grid;
  grid-template-columns: ${LEFT_WIDTH}px 1fr;
  background: ${(p) => (p.$dark ? "#000" : "#fff")};
  border-top: 1px solid ${(p) => (p.$dark ? "#16181c" : "#e5e7eb")};
  @media (max-width: 920px) {
    grid-template-columns: 100%;
  }
`;

/* ---------- Left / Threads ---------- */
const Left = styled.aside<{ $dark: boolean }>`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto 1fr;
  border-right: 1px solid ${(p) => (p.$dark ? "#16181c" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0a0a0a" : "#fff")};
  overflow: hidden;
  @media (max-width: 920px) {
    display: none;
  }
`;

const LeftHeader = styled.div<{ $dark: boolean }>`
  padding: 14px 16px;
  font-weight: 800;
  font-size: 16px;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
`;

const SearchWrap = styled.div<{ $dark: boolean }>`
  padding: 0 12px 12px 12px;
  position: relative;
  input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border-radius: 10px;
    border: 1px solid ${(p) => (p.$dark ? "#24272b" : "#e5e7eb")};
    background: ${(p) => (p.$dark ? "#0f1112" : "#f9fafb")};
    color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
    font-size: 14px;
    outline: none;
  }
  svg {
    position: absolute;
    top: 50%;
    left: 22px;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  }
`;

const ThreadList = styled.div`
  min-height: 0;
  overflow-y: auto;
`;

const Thread = styled.button<{ $active: boolean; $dark: boolean }>`
  width: 100%;
  border: 0;
  text-align: left;
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 10px;
  padding: 10px 14px;
  background: ${(p) =>
    p.$active ? (p.$dark ? "#111315" : "#f8fafc") : "transparent"};
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: ${(p) => (p.$dark ? "#0f1112" : "#f9fafb")};
  }
`;

const StoryRing = styled.div<{ $dark: boolean; $active?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 2px;
  background: ${(p) =>
    p.$active
      ? "conic-gradient(#ff7a7a, #ffcf67, #62d6ff, #ff7a7a)"
      : p.$dark
      ? "#1f232a"
      : "#e5e7eb"};
  display: grid;
  place-items: center;
`;

const Avatar = styled.img<{ $dark: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: ${(p) => (p.$dark ? "#0b0c0e" : "#f1f5f9")};
`;

const ThreadMain = styled.div`
  min-width: 0;
  display: grid;
  align-content: center;
`;

const Uname = styled.div<{ $dark: boolean }>`
  font-weight: 700;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Preview = styled.div<{ $dark: boolean }>`
  font-size: 12px;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RightMeta = styled.div<{ $dark: boolean }>`
  display: grid;
  justify-items: end;
  align-content: center;
  gap: 6px;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  font-size: 11px;
`;

const UnreadDot = styled.span`
  width: 8px;
  height: 8px;
  background: #2563eb;
  border-radius: 50%;
  display: inline-block;
`;

/* ---------- Right / Chat ---------- */
const Right = styled.section<{ $dark: boolean }>`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: ${(p) => (p.$dark ? "#000" : "#fff")};
  overflow: hidden;
`;

const ChatHeader = styled.div<{ $dark: boolean }>`
  height: 56px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid ${(p) => (p.$dark ? "#16181c" : "#e5e7eb")};
`;

const ChatUser = styled.div<{ $dark: boolean }>`
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
`;

const HeaderActions = styled.div<{ $dark?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  button {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: transparent;
    color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
    cursor: pointer;
  }
`;

const Messages = styled.div`
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 16px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DayDivider = styled.div<{ $dark: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  font-size: 12px;
  margin: 12px 0 6px;
  &::before,
  &::after {
    content: "";
    height: 1px;
    background: ${(p) => (p.$dark ? "#16181c" : "#e5e7eb")};
  }
`;

/* 말풍선 + 우측 클릭 메뉴 버튼 */
const BubbleWrap = styled.div<{ $mine?: boolean }>`
  align-self: ${(p) => (p.$mine ? "flex-end" : "flex-start")};
  max-width: min(72%, 540px);
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
`;

const Bubble = styled.div<{ mine?: boolean }>`
  padding: 10px 12px;
  border-radius: ${(p) =>
    p.mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
  background: ${(p) => (p.mine ? "#3797f0" : "#efefef")};
  color: ${(p) => (p.mine ? "#fff" : "#111")};
  font-size: 14px;
  line-height: 1.35;
  white-space: pre-wrap;
  user-select: text;
`;

/* 이미지 말풍선 */
const ImageBubble = styled.img<{ $mine?: boolean }>`
  display: block;
  max-width: min(72vw, 420px);
  max-height: 60vh;
  width: auto;
  height: auto;
  border-radius: ${(p) =>
    p.$mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
  border: 0;
  object-fit: contain;
  background: #111;
`;

const Time = styled.span<{ $dark: boolean; $mine?: boolean }>`
  font-size: 11px;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  align-self: ${(p) => (p.$mine ? "flex-end" : "flex-start")};
`;

const Kebab = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.12s ease;
  ${BubbleWrap}:hover & {
    opacity: 1;
  }
`;

const ContextMenu = styled.div<{ $dark: boolean; $x: number; $y: number }>`
  position: fixed;
  left: ${(p) => p.$x}px;
  top: ${(p) => p.$y}px;
  min-width: 120px;
  background: ${(p) => (p.$dark ? "#0f1112" : "#fff")};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  border: 1px solid ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  z-index: 50;
  overflow: hidden;
`;

const MenuButton = styled.button<{ $dark: boolean }>`
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 14px;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  &:hover {
    background: ${(p) => (p.$dark ? "#111315" : "#f5f7fa")};
  }
`;
const DangerButton = styled(MenuButton)`
  color: #ef4444;
`;

/* 편집 모드 */
const EditArea = styled.textarea<{ $dark: boolean }>`
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0f1112" : "#fff")};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  min-height: 32px;
  min-width: 220px;
  line-height: 1.3;
  resize: none;
  font-size: 14px;
`;

const EditActions = styled.div`
  display: inline-flex;
  gap: 8px;
  margin-top: 6px;
`;

const EditButton = styled.button<{
  $dark: boolean;
  $variant?: "primary" | "ghost";
}>`
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  border: 1px solid
    ${(p) =>
      p.$variant === "primary"
        ? "transparent"
        : p.$dark
        ? "#202327"
        : "#e5e7eb"};
  background: ${(p) =>
    p.$variant === "primary" ? "#3797f0" : p.$dark ? "#0f1112" : "#ffffff"};
  color: ${(p) =>
    p.$variant === "primary" ? "#ffffff" : p.$dark ? "#e5e7eb" : "#0f172a"};
  cursor: pointer;
  &:hover {
    filter: brightness(0.97);
  }
`;

/* 입력 바 & 이모지 */
const InputBar = styled.form<{ $dark: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid ${(p) => (p.$dark ? "#16181c" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0a0a0a" : "#fff")};
`;

const IconBtn = styled.button<{ $dark: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0f1112" : "#fff")};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const Textbox = styled.textarea<{ $dark: boolean }>`
  resize: none;
  height: 36px;
  max-height: 120px;
  padding: 8px 12px;
  border-radius: 18px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0f1112" : "#f9fafb")};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  outline: none;
  font-size: 14px;
`;

const Send = styled.button`
  padding: 0 14px;
  height: 36px;
  border-radius: 18px;
  border: 0;
  background: #3797f0;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
`;

const EmptyState = styled.div<{ $dark: boolean }>`
  height: 100%;
  display: grid;
  place-items: center;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  font-size: 14px;
`;

/* 이모지 피커 */
const EmojiPopover = styled.div<{ $dark: boolean }>`
  position: absolute;
  bottom: 56px;
  left: 56px;
  width: 320px;
  max-height: 300px;
  border-radius: 14px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0f1112" : "#ffffff")};
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  z-index: 40;
  overflow: hidden;
  &::after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 24px;
    border-width: 8px 8px 0 8px;
    border-style: solid;
    border-color: ${(p) => (p.$dark ? "#0f1112" : "#ffffff")} transparent
      transparent transparent;
    filter: drop-shadow(0 -1px 0 ${(p) => (p.$dark ? "#202327" : "#e5e7eb")});
  }
`;

const EmojiHeader = styled.div<{ $dark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid ${(p) => (p.$dark ? "#1a1d21" : "#edf0f3")};
  background: ${(p) => (p.$dark ? "#0c0e10" : "#f9fafb")};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  font-weight: 700;
  font-size: 13px;
`;

const CloseBtn = styled.button<{ $dark: boolean }>`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  background: ${(p) => (p.$dark ? "#0f1112" : "#ffffff")};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  cursor: pointer;
  transition: filter 0.12s ease;
  &:hover {
    filter: brightness(0.96);
  }
`;

const EmojiBody = styled.div<{ $dark: boolean }>`
  padding: 10px;
  max-height: 260px;
  overflow: auto;
  &::-webkit-scrollbar {
    height: 10px;
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: ${(p) => (p.$dark ? "#0b0d0e" : "#f3f4f6")};
    border-radius: 999px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${(p) => (p.$dark ? "#24282c" : "#d1d5db")};
    border-radius: 999px;
    border: 2px solid ${(p) => (p.$dark ? "#0b0d0e" : "#f3f4f6")};
  }
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
`;

const EmojiItem = styled.button<{ $dark: boolean }>`
  font-size: 20px;
  line-height: 1;
  padding: 8px 0;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.12s ease, transform 0.06s ease,
    border-color 0.12s ease;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  &:hover {
    background: ${(p) => (p.$dark ? "#111315" : "#f4f6f8")};
    border-color: ${(p) => (p.$dark ? "#202327" : "#e5e7eb")};
  }
  &:active {
    transform: scale(0.96);
  }
  &:focus-visible {
    outline: 2px solid #3797f0;
    outline-offset: 2px;
  }
`;

/* ---------- Helpers ---------- */
const formatTime = (ts: number) => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};
const sameDay = (a: number, b: number) => {
  const A = new Date(a);
  const B = new Date(b);
  return (
    A.getFullYear() === B.getFullYear() &&
    A.getMonth() === B.getMonth() &&
    A.getDate() === B.getDate()
  );
};

/* 자주 쓰는 이모지 */
const EMOJIS = [
  "😀",
  "😄",
  "😁",
  "😆",
  "😂",
  "🤣",
  "😊",
  "🙂",
  "😉",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😚",
  "😙",
  "😎",
  "🤩",
  "🤗",
  "🙃",
  "😋",
  "😜",
  "🤪",
  "😝",
  "😇",
  "😏",
  "😌",
  "😴",
  "🤤",
  "😪",
  "😮‍💨",
  "😷",
  "🤒",
  "🤕",
  "🤧",
  "🥳",
  "😤",
  "😠",
  "😡",
  "😭",
  "😢",
  "😅",
  "😬",
  "🤔",
  "🤨",
  "😐",
  "😑",
  "😶",
  "🙄",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "💯",
  "🎉",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤍",
];

/* ---------- Component ---------- */
const DmScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [users, setUsers] = useState<DmUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, DmMessage[]>>({});
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // 컨텍스트 메뉴
  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    msgId: string | null;
  }>({ open: false, x: 0, y: 0, msgId: null });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // init data
  useEffect(() => {
    const u = localStorage.getItem(LS_USERS);
    const m = localStorage.getItem(LS_MESSAGES);

    if (u && m) {
      const parsedU: DmUser[] = JSON.parse(u);
      setUsers(parsedU);
      setMessages(JSON.parse(m));
      setActiveId(parsedU[0]?.id ?? null);
    } else {
      const seedUsers: DmUser[] = [
        { id: "u1", name: "최우혁", avatar: AVATAR_FALLBACK, unread: 1 },
        { id: "u2", name: "김유저", avatar: AVATAR_FALLBACK, unread: 0 },
        { id: "u3", name: "홍길동", avatar: AVATAR_FALLBACK, unread: 2 },
      ];
      const now = Date.now();
      const seedMessages: Record<string, DmMessage[]> = {
        u1: [
          { id: "m1", userId: "u1", text: "안녕하세요!", ts: now - 360000 },
          {
            id: "m2",
            userId: "me",
            text: "반가워요 🙂",
            ts: now - 300000,
            mine: true,
          },
        ],
        u2: [{ id: "m3", userId: "u2", text: "테스트 DM", ts: now - 900000 }],
        u3: [
          { id: "m4", userId: "u3", text: "사진 보냈어요!", ts: now - 120000 },
          { id: "m5", userId: "u3", text: "확인 부탁!", ts: now - 60000 },
        ],
      };
      localStorage.setItem(LS_USERS, JSON.stringify(seedUsers));
      localStorage.setItem(LS_MESSAGES, JSON.stringify(seedMessages));
      setUsers(seedUsers);
      setMessages(seedMessages);
      setActiveId(seedUsers[0].id);
    }
  }, []);

  // auto scroll to bottom
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 200;
  }, [activeId, messages, draft, editingId]);

  // clear unread when opening thread
  useEffect(() => {
    if (!activeId) return;
    setUsers((prev) => {
      const next = prev.map((u) =>
        u.id === activeId ? { ...u, unread: 0 } : u
      );
      localStorage.setItem(LS_USERS, JSON.stringify(next));
      return next;
    });
  }, [activeId]);

  useEffect(() => {
    const closeMenu = () => setMenu((m) => ({ ...m, open: false }));
    const closeEmoji = () => setEmojiOpen(false);
    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("click", closeEmoji);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("click", closeEmoji);
    };
  }, []);

  const activeUser = useMemo(
    () => users.find((u) => u.id === activeId) || null,
    [users, activeId]
  );

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

  const thread = messages[activeId ?? ""] || [];

  /* ---------- Send text ---------- */
  const send = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const msg: DmMessage = {
      id: `${Date.now()}`,
      userId: "me",
      text: draft.trim(),
      ts: Date.now(),
      mine: true,
    };
    const next = { ...messages, [activeId]: [...thread, msg] };
    setMessages(next);
    localStorage.setItem(LS_MESSAGES, JSON.stringify(next));
    setDraft("");
    inputRef.current?.focus();
  };

  /* ---------- Send image ---------- */
  const openGallery = () => fileRef.current?.click();

  const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!activeId || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 10);
    const reads = await Promise.all(
      files.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("read error"));
            reader.readAsDataURL(f);
          })
      )
    );

    let nextList = [...thread];
    reads.forEach((dataUrl) => {
      nextList.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: "me",
        imageUrl: dataUrl,
        ts: Date.now(),
        mine: true,
      });
    });

    const next = { ...messages, [activeId]: nextList };
    setMessages(next);
    localStorage.setItem(LS_MESSAGES, JSON.stringify(next));
    e.target.value = "";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (editingId) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ---------- Context menu: edit/delete (mine only) ---------- */
  const openContextMenu = (e: React.MouseEvent, msg: DmMessage) => {
    if (!msg.mine) return;
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY, msgId: msg.id });
  };

  const startEdit = () => {
    if (!menu.msgId || !activeId) return;
    const target = (messages[activeId] || []).find((m) => m.id === menu.msgId);
    if (!target) return;
    setEditingId(target.id);
    setEditText(target.text || "");
    setMenu((m) => ({ ...m, open: false }));
  };

  const saveEdit = () => {
    if (!activeId || !editingId) return;
    const list = messages[activeId] || [];
    const nextList = list.map((m) =>
      m.id === editingId ? { ...m, text: editText } : m
    );
    const next = { ...messages, [activeId]: nextList };
    setMessages(next);
    localStorage.setItem(LS_MESSAGES, JSON.stringify(next));
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const removeMsg = () => {
    if (!menu.msgId || !activeId) return;
    const ok = window.confirm("메시지를 삭제할까요?");
    if (!ok) return;
    const list = messages[activeId] || [];
    const nextList = list.filter((m) => m.id !== menu.msgId);
    const next = { ...messages, [activeId]: nextList };
    setMessages(next);
    localStorage.setItem(LS_MESSAGES, JSON.stringify(next));
    setMenu((m) => ({ ...m, open: false }));
  };

  /* ---------- Emoji ---------- */
  const insertEmoji = (emo: string) => {
    if (editingId) {
      setEditText((t) => t + emo);
    } else {
      setDraft((t) => t + emo);
      inputRef.current?.focus();
    }
    setEmojiOpen(false);
  };

  return (
    <Page $dark={isDarkMode}>
      {/* Left: thread list */}
      <Left $dark={isDarkMode}>
        <LeftHeader $dark={isDarkMode}>메시지</LeftHeader>
        <SearchWrap $dark={isDarkMode}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M10 4a6 6 0 104.472 10.056l4.736 4.736 1.414-1.414-4.736-4.736A6 6 0 0010 4zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" />
          </svg>
          <input
            placeholder="검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </SearchWrap>
        <ThreadList>
          {filteredUsers.map((u) => {
            const last = (messages[u.id] || []).at(-1);
            const lastTime = last ? formatTime(last.ts) : "";
            const previewText = last
              ? last.imageUrl
                ? "[이미지]"
                : last.text
              : "대화 없음";
            return (
              <Thread
                key={u.id}
                $active={u.id === activeId}
                $dark={isDarkMode}
                onClick={() => setActiveId(u.id)}
              >
                <StoryRing $dark={isDarkMode} $active={!!u.unread}>
                  <Avatar
                    $dark={isDarkMode}
                    src={u.avatar || AVATAR_FALLBACK}
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src = AVATAR_FALLBACK)
                    }
                  />
                </StoryRing>
                <ThreadMain>
                  <Uname $dark={isDarkMode}>{u.name}</Uname>
                  <Preview $dark={isDarkMode}>{previewText}</Preview>
                </ThreadMain>
                <RightMeta $dark={isDarkMode}>
                  <div>{lastTime}</div>
                  {u.unread ? <UnreadDot /> : null}
                </RightMeta>
              </Thread>
            );
          })}
        </ThreadList>
      </Left>

      {/* Right: chat area */}
      <Right $dark={isDarkMode}>
        <ChatHeader $dark={isDarkMode}>
          {activeUser ? (
            <>
              <ChatUser $dark={isDarkMode}>
                <Avatar
                  $dark={isDarkMode}
                  src={activeUser.avatar || AVATAR_FALLBACK}
                />
                <div>{activeUser.name}</div>
              </ChatUser>
              <div />
              {/* 전화 버튼 제거, 정보 버튼으로 프로필 이동 */}
              <HeaderActions $dark={isDarkMode}>
                <button
                  title="프로필 보기"
                  onClick={() =>
                    activeUser && navigate(`/user/${activeUser.id}`)
                  }
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M12 8h.01M11 12h2v6h-2z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </HeaderActions>
            </>
          ) : (
            <div style={{ paddingLeft: 12, fontWeight: 800 }}>대화 선택</div>
          )}
        </ChatHeader>

        {activeUser ? (
          <>
            <Messages ref={scrollRef}>
              {thread.length === 0 && (
                <EmptyState $dark={isDarkMode}>대화를 시작해보세요.</EmptyState>
              )}
              {thread.map((m, idx) => {
                const prev = thread[idx - 1];
                const showDivider = !prev || !sameDay(prev.ts, m.ts);
                const isEditing = editingId === m.id;

                return (
                  <React.Fragment key={m.id}>
                    {showDivider && (
                      <DayDivider $dark={isDarkMode}>
                        <span />
                        {new Date(m.ts).toLocaleDateString()}
                        <span />
                      </DayDivider>
                    )}

                    <BubbleWrap
                      $mine={m.mine}
                      onContextMenu={(e) => openContextMenu(e, m)}
                    >
                      {isEditing ? (
                        <>
                          <EditArea
                            $dark={isDarkMode}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEdit();
                              }
                            }}
                            autoFocus
                          />
                          <EditActions>
                            <EditButton
                              $dark={isDarkMode}
                              $variant="ghost"
                              type="button"
                              onClick={saveEdit}
                            >
                              저장
                            </EditButton>
                            <EditButton
                              $dark={isDarkMode}
                              $variant="ghost"
                              type="button"
                              onClick={cancelEdit}
                            >
                              취소
                            </EditButton>
                          </EditActions>
                        </>
                      ) : (
                        <>
                          {m.imageUrl ? (
                            <ImageBubble
                              $mine={m.mine}
                              src={m.imageUrl}
                              alt="첨부 이미지"
                            />
                          ) : (
                            <Bubble mine={m.mine}>{m.text}</Bubble>
                          )}
                          <Time $dark={isDarkMode} $mine={m.mine}>
                            {formatTime(m.ts)}
                          </Time>
                          {m.mine && !m.imageUrl && (
                            <Kebab
                              type="button"
                              title="메뉴"
                              onClick={(e) =>
                                setMenu({
                                  open: true,
                                  x: (e as any).clientX ?? 0,
                                  y: (e as any).clientY ?? 0,
                                  msgId: m.id,
                                })
                              }
                            >
                              ⋯
                            </Kebab>
                          )}
                        </>
                      )}
                    </BubbleWrap>
                  </React.Fragment>
                );
              })}
            </Messages>

            <div style={{ position: "relative" }}>
              {emojiOpen && (
                <EmojiPopover
                  $dark={isDarkMode}
                  role="dialog"
                  aria-label="이모지 선택"
                >
                  <EmojiHeader $dark={isDarkMode}>
                    이모지
                    <CloseBtn
                      $dark={isDarkMode}
                      type="button"
                      aria-label="이모지 닫기"
                      onClick={() => setEmojiOpen(false)}
                    >
                      ✕
                    </CloseBtn>
                  </EmojiHeader>
                  <EmojiBody $dark={isDarkMode}>
                    <EmojiGrid>
                      {EMOJIS.map((emo) => (
                        <EmojiItem
                          key={emo}
                          $dark={isDarkMode}
                          type="button"
                          onClick={() => insertEmoji(emo)}
                          aria-label={`이모지 ${emo}`}
                        >
                          {emo}
                        </EmojiItem>
                      ))}
                    </EmojiGrid>
                  </EmojiBody>
                </EmojiPopover>
              )}

              {/* 숨겨진 파일 입력기 */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={onPickFiles}
              />

              <InputBar
                $dark={isDarkMode}
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <IconBtn
                  $dark={isDarkMode}
                  type="button"
                  title="이모지"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmojiOpen((v) => !v);
                  }}
                >
                  😊
                </IconBtn>

                <Textbox
                  ref={inputRef}
                  $dark={isDarkMode}
                  placeholder="메시지를 입력하세요…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                />

                {/* 갤러리 버튼 */}
                <IconBtn
                  $dark={isDarkMode}
                  type="button"
                  title="이미지"
                  onClick={openGallery}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
                    <path
                      d="M21 15l-4.5-4.5L9 18"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </IconBtn>

                <Send type="submit">보내기</Send>
              </InputBar>
            </div>
          </>
        ) : (
          <EmptyState $dark={isDarkMode}>
            좌측에서 대화를 선택하세요.
          </EmptyState>
        )}
      </Right>

      {/* 컨텍스트 메뉴 (수정/삭제) */}
      {menu.open && (
        <ContextMenu $dark={isDarkMode} $x={menu.x} $y={menu.y}>
          <MenuButton $dark={isDarkMode} type="button" onClick={startEdit}>
            수정
          </MenuButton>
          <DangerButton $dark={isDarkMode} type="button" onClick={removeMsg}>
            삭제
          </DangerButton>
        </ContextMenu>
      )}
    </Page>
  );
};

export default DmScreen;
