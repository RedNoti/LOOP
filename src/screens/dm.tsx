// src/screens/dm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useTheme } from "../components/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";


/* ---------- Types ---------- */
type Person = {
  uid: string;
  name?: string;
  avatar?: string | null;
  email?: string;
};

type DmMessage = {
  id: string;
  userId: string;
  text?: string;
  ts: number;
};

/* ---------- 상수/헬퍼 ---------- */
const DEFAULT_PROFILE_IMG =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-2048x2048-cqe5466q.png";

const PROFILE_IMG_BASE_URL =
  "https://loopmusic.kro.kr:4001/uploads/profile_images/";

// URL 정규화: filename이면 서버 주소 붙이고, 아니면 그대로
function normalizeProfileUrl(url?: string | null): string {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return DEFAULT_PROFILE_IMG;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // 서버에 저장된 filename만 있는 경우
  return `${PROFILE_IMG_BASE_URL}${url}`;
}

/**
 * Firestore profiles/{uid} 문서에서 "사람 이름"으로 쓸만한 값 고르기
 * fallbackUid는 마지막 폴백으로 uid 일부를 보여줄 때 사용
 */
function pickName(data: any, fallbackUid: string): string {
  const candidates = [
    data?.name,
    data?.displayName,
    data?.username,
    data?.userName,
    data?.nick,
    data?.nickName,
    data?.nickname,
    data?.email, // 이메일을 이름 대용으로라도 보여줄지 여부
  ].filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ) as string[];

  if (candidates.length > 0) return candidates[0];
  return "이름 미설정";
}

/**
 * Firestore profiles/{uid} 문서에서 "아바타 이미지 URL"로 쓸만한 값 고르기
 * normalizeProfileUrl까지 해서 최종 안전한 문자열을 돌려준다.
 */
function pickAvatar(data: any): string {
  const candidates = [
    data?.avatar,
    data?.photoURL,
    data?.photoUrl,
    data?.profileImage,
    data?.profileImg,
    data?.profileImageUrl,
    data?.imageUrl,
    data?.filename,
  ].filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ) as string[];

  const raw = candidates.length > 0 ? candidates[0] : null;
  return normalizeProfileUrl(raw);
}

/**
 * Firestore profiles/{uid} → Person
 * 이 함수가 이 파일의 "단일 진실 소스"가 된다.
 * (= 다른 곳에서 중복으로 프로필 해석하지 말고 전부 이걸 거쳐 가게)
 */
async function fetchProfile(uid: string): Promise<Person> {
  const snap = await getDoc(doc(db, "profiles", uid));

  if (!snap.exists()) {
    // 문서 없는 경우에도 Person 구조는 유지한다.
    return {
      uid,
      name: "이름 미설정",
      avatar: DEFAULT_PROFILE_IMG,
      email: undefined,
    };
  }

  const data = snap.data() as any;

  const name = pickName(data, uid);
  const avatarFinal = pickAvatar(data);
  const email =
    data?.email || data?.userEmail || data?.mail || undefined;

  return {
    uid,
    name,
    avatar: avatarFinal || DEFAULT_PROFILE_IMG,
    email,
  };
}

/* ---------- Style ---------- */
const LEFT_WIDTH = 260;
const LIGHT_BORDER = "#d1d5db";
const LIGHT_SOFT_BG = "#f3f4f6";

const Page = styled.div<{ $dark: boolean }>`
  height: calc(100vh - 70px);
  min-height: 0;
  display: grid;
  grid-template-columns: ${LEFT_WIDTH}px 1fr;
  background: ${(p) => (p.$dark ? "#000" : "#fff")};
  padding-top: 6px;
  overflow: hidden;
  @media (max-width: 920px) {
    grid-template-columns: 100%;
  }
`;
const Left = styled.aside<{ $dark: boolean }>`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto 1fr;
  border-right: 1px solid ${(p) => (p.$dark ? "#16181c" : LIGHT_BORDER)};
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
    border: 1px solid ${(p) => (p.$dark ? "#24272b" : LIGHT_BORDER)};
    background: ${(p) => (p.$dark ? "#0f1112" : LIGHT_SOFT_BG)};
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
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--thumb, #cbd5e1);
    border-radius: 999px;
  }
`;
const Row = styled.button<{ $active: boolean; $dark: boolean }>`
  position: relative;
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
    background: ${(p) => (p.$dark ? "#0f1112" : LIGHT_SOFT_BG)};
  }
`;
const StoryRing = styled.div<{ $dark: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 2px;
  background: ${(p) => (p.$dark ? "#1f232a" : "#e5e7eb")};
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
const RowMain = styled.div`
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
  border-bottom: 1px solid ${(p) => (p.$dark ? "#16181c" : LIGHT_BORDER)};
`;
const ChatUser = styled.div<{ $dark: boolean }>`
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
`;
const Messages = styled.div`
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 16px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--thumb, #cbd5e1);
    border-radius: 999px;
  }
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
    background: ${(p) => (p.$dark ? "#16181c" : LIGHT_BORDER)};
  }
`;
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
const Time = styled.span<{ $dark: boolean; $mine?: boolean }>`
  font-size: 11px;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  align-self: ${(p) => (p.$mine ? "flex-end" : "flex-start")};
`;
const InputBar = styled.form<{ $dark: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid ${(p) => (p.$dark ? "#16181c" : LIGHT_BORDER)};
  background: ${(p) => (p.$dark ? "#0a0a0a" : "#fff")};
`;
const IconBtn = styled.button<{ $dark: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : LIGHT_BORDER)};
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
  border: 1px solid ${(p) => (p.$dark ? "#202327" : LIGHT_BORDER)};
  background: ${(p) => (p.$dark ? "#0f1112" : LIGHT_SOFT_BG)};
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  outline: none;
  font-size: 14px;
`;
const Send = styled.button<{ disabled?: boolean }>`
  padding: 0 14px;
  height: 36px;
  border-radius: 18px;
  border: 0;
  background: ${({ disabled }) => (disabled ? "#9ca3af" : "#3797f0")};
  color: #fff;
  font-weight: 800;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;
const EmptyState = styled.div<{ $dark: boolean }>`
  height: 100%;
  display: grid;
  place-items: center;
  color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  font-size: 14px;
`;

/* 이모지 팝오버 */
const EmojiPopover = styled.div<{ $dark: boolean }>`
  position: absolute;
  bottom: 56px;
  left: 12px;
  width: 320px;
  max-height: 300px;
  border-radius: 14px;
  border: 1px solid ${(p) => (p.$dark ? "#202327" : LIGHT_BORDER)};
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
    filter: drop-shadow(
      0 -1px 0 ${(p) => (p.$dark ? "#202327" : LIGHT_BORDER)}
    );
  }
`;
const EmojiHeader = styled.div<{ $dark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid ${(p) => (p.$dark ? "#1a1d21" : "#edf0f3")};
  background: ${(p) => (p.$dark ? "#0c0e10" : LIGHT_SOFT_BG)};
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
  border: 1px solid ${(p) => (p.$dark ? "#202327" : LIGHT_BORDER)};
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
    border-color: ${(p) => (p.$dark ? "#202327" : LIGHT_BORDER)};
  }
  &:active {
    transform: scale(0.96);
  }
  &:focus-visible {
    outline: 2px solid #3797f0;
    outline-offset: 2px;
  }
`;

/* ---------- 유틸 ---------- */
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

/* ---------- 이모지 모음 ---------- */
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
  const [searchParams] = useSearchParams();

  /* 로그인 유저 정보 */
  const [myUid, setMyUid] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [myName, setMyName] = useState<string>(
    auth.currentUser?.displayName || "나"
  );
  const [myAvatar, setMyAvatar] = useState<string | null>(
    auth.currentUser?.photoURL || null
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setMyUid(u?.uid ?? null);
      setMyName(u?.displayName || "나");
      setMyAvatar(u?.photoURL || null);
    });
    return unsub;
  }, []);

  /* DM 목록 (스레드) */
  const [threads, setThreads] = useState<
    Array<{
      threadId: string;
      peerUid: string;
      lastMessage?: string;
      updatedAt?: number;
      lastSenderId?: string;
    }>
  >([]);

  /* uid -> Person 캐시 */
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});

  /* 현재 선택된 상대 uid */
  const [activeUid, setActiveUid] = useState<string | null>(null);

  /* 이모지 상태 */
  const [emojiOpen, setEmojiOpen] = useState(false);

  const lastSeenRef = useRef<Record<string, number>>({});

// helper: 저장
function markThreadSeen(threadId: string, ts: number) {
  if (!threadId || !myUid) return;
  lastSeenRef.current[threadId] = ts;
  const storageKey = `dm_seen_${myUid}_${threadId}`;
  localStorage.setItem(storageKey, String(ts));
}

// helper: 불러오기
function getThreadSeen(threadId: string): number {
  if (!threadId || !myUid) return 0;
  // 메모리에 있으면 그거
  if (lastSeenRef.current[threadId]) {
    return lastSeenRef.current[threadId];
  }
  // 없으면 localStorage에서 가져와서 ref에 적재
  const storageKey = `dm_seen_${myUid}_${threadId}`;
  const raw = localStorage.getItem(storageKey);
  const parsed = raw ? parseInt(raw, 10) : 0;
  lastSeenRef.current[threadId] = parsed || 0;
  return parsed || 0;
}

  /* 입력 상태 */
  const [queryText, setQueryText] = useState("");
  const [draft, setDraft] = useState("");

  /* 스크롤 / 입력창 ref */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * 특정 uid의 프로필을 Firestore에서 읽고 peopleMap에 반영한다.
   * (동일 uid가 이미 peopleMap에 있더라도 더 정확한 정보면 덮어쓴다.)
   */
  const ensurePersonCached = async (uid: string) => {
    try {
      const prof = await fetchProfile(uid);

      setPeopleMap((prev) => {
        const before = prev[uid];

        // 이미 있고 값이 동일하면 굳이 state 갱신 안 해서 불필요 렌더 줄임
        if (
          before &&
          before.name === prof.name &&
          before.avatar === prof.avatar &&
          before.email === prof.email
        ) {
          return prev;
        }

        return {
          ...prev,
          [uid]: {
            uid: prof.uid,
            name: prof.name ?? "이름 미설정",
            avatar: prof.avatar ?? DEFAULT_PROFILE_IMG,
            email: prof.email,
          },
        };
      });

      return prof;
    } catch (e) {
      console.warn("[DM] ensurePersonCached error:", uid, e);
    }
  };

  /* DM 수신 시 알림함(localStorage)에 항목 추가 */
  const pushLocalInboxDM = ({
  meUid,
  fromUid,
  fromName,
  fromAvatar,
  text,
}: {
  meUid: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string | null | undefined;
  text: string;
}) => {
  const key = meUid ? `notif_inbox_${meUid}` : "notif_inbox_guest";

  // 현재 인박스 불러오기
  let inbox: any[] = [];
  try {
    const raw = localStorage.getItem(key);
    inbox = raw ? JSON.parse(raw) : [];
  } catch {
    inbox = [];
  }

  const now = Date.now();
  const avatarNormalized = fromAvatar
    ? normalizeProfileUrl(fromAvatar)
    : DEFAULT_PROFILE_IMG;

  // 중복 알림 방지 (같은 사람이 연속으로 보냈을 때 너무 많이 안 쌓이게 하고 싶으면 여기서 검사 가능)
  // 여기서는 일단 그냥 바로 푸시

  const newItem = {
    id: `dm_${fromUid}_${now}`,
    kind: "dm",
    title: `${fromName} 님으로부터 새 메시지`,
    desc: text,
    ts: now,
    read: false,
    avatar: avatarNormalized,
    link: `/dm?uid=${fromUid}&name=${encodeURIComponent(
      fromName
    )}&avatar=${encodeURIComponent(avatarNormalized)}`,
  };

  // 가장 앞에 넣고 최대 200개 유지 (선택사항)
  const updated = [newItem, ...inbox].slice(0, 200);
  localStorage.setItem(key, JSON.stringify(updated));

  // 🔥 알림센터 / 알림뱃지 실시간 갱신용 이벤트 브로드캐스트
  window.dispatchEvent(new Event("notif_inbox_updated"));
};

  // DM 화면 진입 시 (?uid=...&name=...&avatar=...) 처리
  useEffect(() => {
    const uid = searchParams.get("uid");
    const nameQ = searchParams.get("name");
    const avatarQ = searchParams.get("avatar");
    if (!uid) return;

    setActiveUid(uid);

    // URL 파라미터 기반 임시 정보 (우선 표시용)
    const guessedName =
      nameQ && decodeURIComponent(nameQ).trim().length > 0
        ? decodeURIComponent(nameQ)
        : peopleMap[uid]?.name || "이름 미설정";

    const guessedAvatar = avatarQ
      ? normalizeProfileUrl(decodeURIComponent(avatarQ))
      : peopleMap[uid]?.avatar || DEFAULT_PROFILE_IMG;

    setPeopleMap((prev) => ({
      ...prev,
      [uid]: {
        uid,
        name: guessedName,
        avatar: guessedAvatar,
        email: prev[uid]?.email || "",
      },
    }));

    // 이후 진짜 Firestore 값으로 정정
    ensurePersonCached(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 내가 포함된 dm_threads 구독
  useEffect(() => {
    if (!myUid) return;

    const qThreads = query(
      collection(db, "dm_threads"),
      where("members", "array-contains", myUid)
    );

    const off = onSnapshot(qThreads, async (snap) => {
      const rows = snap.docs.map((d) => {
        const x = d.data() as any;
        const members: string[] = Array.isArray(x.members) ? x.members : [];
        const peerUid = members.find((m) => m !== myUid) || myUid;

        const updatedAt =
          typeof x.updatedAt?.toMillis === "function"
            ? x.updatedAt.toMillis()
            : undefined;

        return {
          threadId: d.id,
          peerUid,
          lastMessage: x.lastMessage || "",
          updatedAt,
          lastSenderId: x.lastSenderId || "",
        };
      });

      // 최신 순 정렬
      rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      setThreads(rows);

      // 스레드 등장 인물들 캐시 프리로드
      await Promise.all(rows.map((r) => ensurePersonCached(r.peerUid)));
    });

    return off;
  }, [myUid]);

  // activeUid가 바뀔 때마다 그 프로필을 실시간 반영
  useEffect(() => {
    if (!activeUid) return;

    // Firestore 실시간 구독해서 그 유저 프로필 바뀌면 즉시 UI에 반영
    const pRef = doc(db, "profiles", activeUid);
    const unsub = onSnapshot(pRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        const liveName = pickName(d, activeUid);
        const liveAvatar = pickAvatar(d);
        const liveEmail = d?.email || d?.userEmail || d?.mail || "";

        setPeopleMap((prev) => ({
          ...prev,
          [activeUid]: {
            uid: activeUid,
            name: liveName || "이름 미설정",
            avatar: liveAvatar || DEFAULT_PROFILE_IMG,
            email: liveEmail,
          },
        }));
      }
    });

    // 그리고 한 번 더 fetchProfile로 제대로 동기화(안전망)
    ensurePersonCached(activeUid);

    return unsub;
  }, [activeUid]);

  // threadId: 내 uid와 상대 uid를 정렬 후 이어붙인 고유키
  const threadId = useMemo(() => {
    if (!myUid || !activeUid) return null;
    return [myUid, activeUid].sort().join("__");
  }, [myUid, activeUid]);

  /* 메시지 목록 + 새 메시지 감지해서 알림 push */
  const [messages, setMessages] = useState<DmMessage[]>([]);

  useEffect(() => {
  if (!threadId) return;
  if (!myUid) return;

  const qMsg = query(
    collection(db, "dm_threads", threadId, "messages"),
    orderBy("ts", "asc")
  );

  const off = onSnapshot(qMsg, async (snap: QuerySnapshot<DocumentData>) => {
  const list = snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      id: d.id,
      userId: String(x.userId ?? ""),
      text: x.text ?? "",
      ts:
        typeof x.ts?.toMillis === "function"
          ? x.ts.toMillis()
          : Date.now(),
    } as DmMessage;
  });

  setMessages(list);

  if (!list.length) return;

  const last = list[list.length - 1];

  // 내가 보낸 메시지는 알림 대상 아님
  if (last.userId === myUid) {
    markThreadSeen(threadId, last.ts);
    return;
  }

  const prevSeenTs = getThreadSeen(threadId);
  if (last.ts <= prevSeenTs) {
    return;
  }

  // === 새로 받은 DM이므로 알림 생성 시작 ===

  // 1) 상대방 프로필 캐시가 있는지 확인
  let senderPerson = peopleMap[last.userId];
  if (!senderPerson) {
    // 캐시에 없으면 Firestore에서 한번 가져오고 state 갱신
    const fetched = await fetchProfile(last.userId);
    senderPerson = {
      uid: fetched.uid,
      name: fetched.name ?? "이름 미설정",
      avatar: fetched.avatar ?? DEFAULT_PROFILE_IMG,
      email: fetched.email,
    };

    // 캐시에도 넣어주기
    setPeopleMap((prev) => ({
      ...prev,
      [last.userId]: senderPerson!,
    }));
  }

  // 2) 알림에 들어갈 이름/아바타 결정
  const senderNameFinal =
    senderPerson.name && senderPerson.name.trim().length > 0
      ? senderPerson.name
      : last.userId.slice(0, 6); // 그래도 혹시 없으면 UID 앞 6글자

  const senderAvatarFinal =
    senderPerson.avatar && senderPerson.avatar.trim().length > 0
      ? senderPerson.avatar
      : undefined;

  // 3) 로컬 알림 인박스에 push
  pushLocalInboxDM({
    meUid: myUid,
    fromUid: last.userId,
    fromName: senderNameFinal,
    fromAvatar: senderAvatarFinal,
    text: last.text || "",
  });

  // 4) 브라우저 Notification API (선택)
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    new Notification(`${senderNameFinal} 님의 DM`, {
      body: last.text || "",
      icon: senderAvatarFinal
        ? normalizeProfileUrl(senderAvatarFinal)
        : DEFAULT_PROFILE_IMG,
    });
  }

  // 5) 이 메시지는 본 걸로 기록
  markThreadSeen(threadId, last.ts);
});

  return off;
}, [threadId, myUid]);

  // 스크롤을 항상 최신 메시지 쪽으로
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop =
      scrollRef.current.scrollHeight + 200;
  }, [messages, draft, activeUid]);

  // 현재 우측 상단 헤더에 표시할 상대
  const activePerson: Person | null = activeUid
    ? {
        uid: activeUid,
        name: peopleMap[activeUid]?.name || "이름 미설정",
        avatar:
          peopleMap[activeUid]?.avatar || DEFAULT_PROFILE_IMG,
        email: peopleMap[activeUid]?.email || "",
      }
    : null;

  /* 전송 가능 여부 */
  const isThreadOpen = !!threadId;
  const sendDisabled = !isThreadOpen || !draft.trim();

  /* 메시지 전송 */
  const handleSend = async (e?: React.FormEvent | MouseEvent) => {
    (e as any)?.preventDefault?.();
    if (!myUid || !activeUid || !draft.trim()) return;

    const textToSend = draft.trim();

    // 1) 스레드 upsert
    await setDoc(
      doc(db, "dm_threads", threadId!),
      {
        members: [myUid, activeUid],
        updatedAt: serverTimestamp(),
        lastMessage: textToSend,
        lastSenderId: myUid,
      },
      { merge: true }
    );

    // 2) 메시지 추가
    await addDoc(
      collection(db, "dm_threads", threadId!, "messages"),
      {
        userId: myUid,
        text: textToSend,
        ts: serverTimestamp(),
      }
    );

    // 3) Firestore notifications에도 기록해서 상대가 알림 볼 수 있게
    try {
      await addDoc(collection(db, "notifications"), {
        recipientUid: activeUid,
        senderUid: myUid,
        kind: "dm",
        title: `${myName} 님으로부터 새 메시지`,
        desc: textToSend,
        ts: serverTimestamp(),
        read: false,
        avatar: myAvatar
          ? normalizeProfileUrl(myAvatar)
          : DEFAULT_PROFILE_IMG,
        link: `/dm?uid=${myUid}&name=${encodeURIComponent(
          myName
        )}&avatar=${encodeURIComponent(
          myAvatar
            ? normalizeProfileUrl(myAvatar)
            : DEFAULT_PROFILE_IMG
        )}`,
      });
    } catch (err) {
      console.warn("[DM] notification skipped:", err);
    }

    setDraft("");
    inputRef.current?.focus();
  };

  /* 이모지 삽입 */
  const insertEmoji = (emo: string) => {
    setDraft((t) => t + emo);
    inputRef.current?.focus();
    setEmojiOpen(false);
  };

  /* 엔터로 전송 */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* 좌측 목록 (검색 필터 포함) */
  const visibleThreads = useMemo(() => {
    const q = queryText.trim().toLowerCase();

    const withLabel = threads.map((t) => {
      const p = peopleMap[t.peerUid];
      const labelName =
        (p?.name && p.name.trim().length > 0
          ? p.name
          : "이름 미설정") || "이름 미설정";

      const avatarSrc = p?.avatar
        ? normalizeProfileUrl(p.avatar)
        : DEFAULT_PROFILE_IMG;

      return {
        ...t,
        label: labelName,
        avatar: avatarSrc,
      };
    });

    return q
      ? withLabel.filter((r) =>
          r.label.toLowerCase().includes(q)
        )
      : withLabel;
  }, [threads, peopleMap, queryText]);

  /* ---------- JSX 렌더 ---------- */
  return (
    <Page $dark={isDarkMode}>
      {/* Left: DM 리스트 / 검색 */}
      <Left $dark={isDarkMode}>
        <LeftHeader $dark={isDarkMode}>메시지</LeftHeader>

        <SearchWrap $dark={isDarkMode}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M10 4a6 6 0 104.472 10.056l4.736 4.736 1.414-1.414-4.736-4.736A6 6 0 0010 4zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" />
          </svg>
          <input
            placeholder="검색"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
        </SearchWrap>

        <ThreadList
          style={{
            ["--thumb" as any]: isDarkMode
              ? "#3a3f44"
              : "#cbd5e1",
          }}
        >
          {visibleThreads.length === 0 ? (
            <div className="text-gray-400 px-3 py-2">
              대상이 없습니다
            </div>
          ) : (
            visibleThreads.map((t) => {
              const lastTime = t.updatedAt
                ? formatTime(t.updatedAt)
                : "";
              const preview = t.lastMessage
                ? t.lastMessage
                : t.lastSenderId
                ? "새 메시지"
                : "대화 없음";

              return (
                <Row
                  key={t.threadId}
                  $active={t.peerUid === activeUid}
                  $dark={isDarkMode}
                  onClick={() => setActiveUid(t.peerUid)}
                >
                  <StoryRing $dark={isDarkMode}>
                    <Avatar
                      $dark={isDarkMode}
                      src={t.avatar || DEFAULT_PROFILE_IMG}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          DEFAULT_PROFILE_IMG;
                      }}
                    />
                  </StoryRing>

                  <RowMain>
                    <Uname $dark={isDarkMode}>
                      {t.label}
                    </Uname>
                    <Preview $dark={isDarkMode}>
                      {preview}
                    </Preview>
                  </RowMain>

                  <RightMeta $dark={isDarkMode}>
                    <div>{lastTime}</div>
                  </RightMeta>
                </Row>
              );
            })
          )}
        </ThreadList>
      </Left>

      {/* Right: 현재 선택된 DM */}
      <Right $dark={isDarkMode}>
        <ChatHeader $dark={isDarkMode}>
          {activePerson ? (
            <>
              <ChatUser $dark={isDarkMode}>
                <Avatar
                  $dark={isDarkMode}
                  src={
                    activePerson.avatar
                      ? normalizeProfileUrl(
                          activePerson.avatar
                        )
                      : DEFAULT_PROFILE_IMG
                  }
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      DEFAULT_PROFILE_IMG;
                  }}
                />
                <div>
                  {activePerson.name ||
                    "이름 미설정"}
                </div>
              </ChatUser>

              <div />

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <button
                  title="프로필"
                  onClick={() =>
                    navigate(`/user/${activePerson.uid}`)
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: `1px solid ${
                      isDarkMode
                        ? "#202327"
                        : LIGHT_BORDER
                    }`,
                    background: "transparent",
                    color: isDarkMode
                      ? "#e5e7eb"
                      : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  i
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                paddingLeft: 12,
                fontWeight: 800,
              }}
            >
              대화 선택
            </div>
          )}
        </ChatHeader>

        {isThreadOpen ? (
          messages.length > 0 ? (
            <Messages
              ref={scrollRef}
              style={{
                ["--thumb" as any]: isDarkMode
                  ? "#3a3f44"
                  : "#cbd5e1",
              }}
            >
              {messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const showDivider =
                  !prev || !sameDay(prev.ts, m.ts);
                const mine = m.userId === myUid;

                return (
                  <React.Fragment key={m.id}>
                    {showDivider && (
                      <DayDivider $dark={isDarkMode}>
                        <span />
                        {new Date(
                          m.ts
                        ).toLocaleDateString()}
                        <span />
                      </DayDivider>
                    )}

                    <BubbleWrap $mine={mine}>
                      <Bubble mine={mine}>
                        {m.text}
                      </Bubble>
                      <Time
                        $dark={isDarkMode}
                        $mine={mine}
                      >
                        {formatTime(m.ts)}
                      </Time>
                    </BubbleWrap>
                  </React.Fragment>
                );
              })}
            </Messages>
          ) : (
            <EmptyState $dark={isDarkMode}>
              아직 메시지가 없습니다. 첫
              메시지를 보내보세요.
            </EmptyState>
          )
        ) : (
          <EmptyState $dark={isDarkMode}>
            좌측에서 대화를 선택하거나
            프로필에서 DM을 열어보세요.
          </EmptyState>
        )}

        {/* 입력 영역 */}
        {isThreadOpen && (
          <div style={{ position: "relative" }}>
            {/* 이모지 팝오버 */}
            {emojiOpen && (
              <EmojiPopover
                $dark={isDarkMode}
                role="dialog"
                aria-label="이모지 선택"
                onClick={(e) => e.stopPropagation()}
              >
                <EmojiHeader $dark={isDarkMode}>
                  이모지
                  <CloseBtn
                    $dark={isDarkMode}
                    type="button"
                    aria-label="이모지 닫기"
                    onClick={() =>
                      setEmojiOpen(false)
                    }
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
                        onClick={() =>
                          insertEmoji(emo)
                        }
                        aria-label={`이모지 ${emo}`}
                      >
                        {emo}
                      </EmojiItem>
                    ))}
                  </EmojiGrid>
                </EmojiBody>
              </EmojiPopover>
            )}

            {/* 실제 입력 바 */}
            <InputBar
              $dark={isDarkMode}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              {/* 이모지 버튼 */}
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

              {/* 텍스트 영역 */}
              <Textbox
                ref={inputRef}
                $dark={isDarkMode}
                placeholder="메시지를 입력하세요…"
                value={draft}
                onChange={(e) =>
                  setDraft(e.target.value)
                }
                onKeyDown={onKeyDown}
              />

              {/* 전송 버튼 */}
              <Send
                type="submit"
                disabled={sendDisabled}
              >
                보내기
              </Send>
            </InputBar>
          </div>
        )}
      </Right>
    </Page>
  );
};

export default DmScreen;
