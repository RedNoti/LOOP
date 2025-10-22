// src/screens/dm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useTheme } from "../components/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, where, limit, type QuerySnapshot, type DocumentData
} from "firebase/firestore";

/* ---------- Types ---------- */


type Person = { uid: string; name?: string; avatar?: string | null; email?: string };

type DmMessage = {
  id: string;
  userId: string;
  text?: string;
  ts: number;
};

const DEFAULT_PROFILE_IMG =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-2048x2048-cqe5466q.png";

const AVATAR_FALLBACK = DEFAULT_PROFILE_IMG;

const PROFILE_IMG_BASE_URL =
  "https://loopmusic.kro.kr:4001/uploads/profile_images/";

// 파일명/절대URL 모두 안전하게 처리
function normalizeProfileUrl(url?: string | null): string {
  if (!url) return DEFAULT_PROFILE_IMG;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${PROFILE_IMG_BASE_URL}${url}`;
}
function pickName(d: any, fallbackUid: string): string {
  const candidates = [
    d?.nickname, d?.nickName,
    d?.userName, d?.username,
    d?.name,
    d?.displayName,
    d?.email,
  ];
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return found || fallbackUid.slice(0, 6);
}
function pickAvatar(d: any): string {
  const candidates = [
    d?.photoUrl, d?.photoURL,
    d?.profileImage, d?.profileImg,
    d?.avatar,
    d?.filename,
    d?.imageUrl,
  ];
  const raw = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return normalizeProfileUrl(raw);
}

// 프로필 한 건 로드: profiles 우선 → 없으면 users 폴백 (Post.tsx가 name/photoUrl을 쓰는 것과 같은 흐름) 
async function loadPerson(uid: string): Promise<Person> {
  // 1) profiles/{uid} 직행
  const pDoc = await getDoc(doc(db, "profiles", uid));
  if (pDoc.exists()) {
    const d = pDoc.data() as any;
    return {
      uid,
      name: pickName(d, uid),
      avatar: pickAvatar(d),
      email: d?.email ?? "",
    };
  }

  // 2) profiles: uid/userId/ownerId 필드로 1건 찾기
  for (const key of ["uid", "userId", "ownerId"]) {
    const qs = await getDocs(
      query(collection(db, "profiles"), where(key, "==", uid), limit(1))
    );
    if (!qs.empty) {
      const d = qs.docs[0].data() as any;
      return {
        uid,
        name: pickName(d, uid),
        avatar: pickAvatar(d),
        email: d?.email ?? "",
      };
    }
  }

  // 3) users/{uid} 직행
  const uDoc = await getDoc(doc(db, "users", uid));
  if (uDoc.exists()) {
    const d = uDoc.data() as any;
    return {
      uid,
      name: pickName(d, uid),
      avatar: pickAvatar(d),
      email: d?.email ?? "",
    };
  }

  // 4) users: uid/userId/ownerId 필드로 1건 찾기
  for (const key of ["uid", "userId", "ownerId"]) {
    const qs = await getDocs(
      query(collection(db, "users"), where(key, "==", uid), limit(1))
    );
    if (!qs.empty) {
      const d = qs.docs[0].data() as any;
      return {
        uid,
        name: pickName(d, uid),
        avatar: pickAvatar(d),
        email: d?.email ?? "",
      };
    }
  }

  // 5) 최후 폴백
  return {
    uid,
    name: uid.slice(0, 6),
    avatar: DEFAULT_PROFILE_IMG,
    email: "",
  };
}
async function ensurePersonCached(
  uid: string,
  setPeople: React.Dispatch<React.SetStateAction<Record<string, Person>>>
) {
  try {
    const person = await loadPerson(uid);
    setPeople((prev) => {
      const before = prev[uid];
      // 같은 내용이면 상태 변경 생략(불필요 리렌더 방지)
      if (before && before.name === person.name && before.avatar === person.avatar) {
        return prev;
      }
      return { ...prev, [uid]: person };
    });
  } catch (e) {
    console.warn("[DM] ensurePersonCached error:", uid, e);
  }
}
// 🔽 [추가] 프로필 이미지 서버 주소
const LEFT_WIDTH = 260;
const LIGHT_BORDER = "#d1d5db";
const LIGHT_SOFT_BG = "#f3f4f6";



/* ---------- Styled ---------- */
// (스타일 코드는 이전과 동일)
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

/* ---------- 이모지 피커 스타일 (동일) ---------- */
const EmojiPopover = styled.div<{ $dark: boolean }>`
  position: absolute;
  bottom: 56px;
  left: 12px; /* DmScreen은 좌측 버튼 위치가 다름 */
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

/* ---------- 이모지 상수 (동일) ---------- */
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

  // (로그인 사용자, 이모지 팝오버, 스레드 목록, 프로필 캐시, activeUid, URL 파라미터 로직 등은 모두 동일)
  // ... (이전 코드와 동일한 부분) ...
  // 로그인 사용자
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

  // [추가] 이모지 팝오버 닫기용
  useEffect(() => {
    const closeEmoji = () => setEmojiOpen(false);
    window.addEventListener("click", closeEmoji);
    return () => window.removeEventListener("click", closeEmoji);
  }, []);

  // 좌측: 내가 멤버인 스레드 목록
  const [threads, setThreads] = useState<
    Array<{
      threadId: string;
      peerUid: string;
      lastMessage?: string;
      updatedAt?: number;
      lastSenderId?: string;
    }>
  >([]);

  // uid→프로필 캐시 (좌측/우측 이름·이미지 표시용)
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});

  // 선택된 상대 uid
  const [activeUid, setActiveUid] = useState<string | null>(null);

  // URL 파라미터로 진입(프로필의 DM 버튼)
  // --- [REPLACE] URL 파라미터로 진입했을 때 선반영 ---
// URL 파라미터로 진입(프로필의 DM 버튼)
// 1) 임시로 peopleMap 채움 → 2) 바로 DB에서 진짜 값 재조회하여 덮어쓰기
useEffect(() => {
  const uid = searchParams.get("uid");
  const nameQ = searchParams.get("name");
  const avatarQ = searchParams.get("avatar");
  if (!uid) return;

  setActiveUid(uid);

  // (1) 빠른 표시용 임시 값
  setPeopleMap((prev) => ({
    ...prev,
    [uid]: {
      uid,
      name: nameQ ? decodeURIComponent(nameQ) : prev[uid]?.name || "사용자",
      avatar: avatarQ
        ? (avatarQ.startsWith("http")
            ? decodeURIComponent(avatarQ)
            : normalizeProfileUrl(decodeURIComponent(avatarQ)))
        : prev[uid]?.avatar || DEFAULT_PROFILE_IMG,
      email: prev[uid]?.email || "",
    },
  }));

  // (2) 실제 DB 값으로 강제 덮어쓰기
  ensurePersonCached(uid, setPeopleMap);
}, [searchParams]);



  // 스레드 목록 구독 (내 uid가 정해지면)
  // --- [REPLACE] 스레드 구독 + 프로필 캐시 보강(Post.tsx 방식) ---
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

    rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    setThreads(rows);
    
    await Promise.all(rows.map((r) => ensurePersonCached(r.peerUid, setPeopleMap)));
  });

  return off;
}, [myUid]);

useEffect(() => {
  if (!activeUid) return;

  const pRef = doc(db, "profiles", activeUid);
  const unsub = onSnapshot(pRef, (snap) => {
    if (snap.exists()) {
      const d = snap.data() as any;
      setPeopleMap((prev) => ({
        ...prev,
        [activeUid]: {
          uid: activeUid,
          name: pickName(d, activeUid),
          avatar: pickAvatar(d),
          email: d?.email ?? "",
        },
      }));
    }
  });

  return unsub;
}, [activeUid]);

useEffect(() => {
  if (!activeUid) return;
  ensurePersonCached(activeUid, setPeopleMap);
}, [activeUid]);
 // peopleMap을 넣으면 무한루프 위험
 // 

  // 스레드ID 계산
  const threadId = useMemo(() => {
    if (!myUid || !activeUid) return null;
    return [myUid, activeUid].sort().join("__");
  }, [myUid, activeUid]);

  // 메시지 구독
  const [messages, setMessages] = useState<DmMessage[]>([]);
  useEffect(() => {
    if (!threadId) return;
    const q = query(
      collection(db, "dm_threads", threadId, "messages"),
      orderBy("ts", "asc")
    );
    const off = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          userId: String(x.userId ?? ""),
          text: x.text ?? "",
          // imageUrl: x.imageUrl ?? null, // 이미지 기능 제거됨
          ts:
            typeof x.ts?.toMillis === "function" ? x.ts.toMillis() : Date.now(),
        } as DmMessage;
      });
      setMessages(list);
    });
    return off;
  }, [threadId]);

  // 상대 표시 정보
  const activePerson: Person | null = activeUid
    ? peopleMap[activeUid] || {
        uid: activeUid,
        name: "사용자", // 기본값
        avatar: AVATAR_FALLBACK,
      }
    : null;

  // 입력 상태
  const [queryText, setQueryText] = useState("");
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false); // [추가]
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 200;
  }, [messages, draft, activeUid]);

  const isThreadOpen = !!threadId;
  const sendDisabled = !isThreadOpen || !draft.trim();

  // 텍스트 전송
  const handleSend = async (e?: React.FormEvent | MouseEvent) => {
    (e as any)?.preventDefault?.();
    if (!myUid || !activeUid || !draft.trim()) return;

    const textToSend = draft.trim();

    // 1) 부모 스레드 upsert
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
    await addDoc(collection(db, "dm_threads", threadId!, "messages"), {
      userId: myUid,
      text: textToSend,
      ts: serverTimestamp(),
    });

    // 3) 알림(선택)
    try {
      await addDoc(collection(db, "notifications"), {
        recipientUid: activeUid,
        senderUid: myUid,
        kind: "dm",
        title: `${myName} 님으로부터 새 메시지`,
        desc: textToSend,
        ts: serverTimestamp(),
        read: false,
        avatar: myAvatar || AVATAR_FALLBACK,
        link: `/dm?uid=${myUid}&name=${encodeURIComponent(
          myName
        )}&avatar=${encodeURIComponent(
          // 🔽 [수정] 알림에도 URL 대신 filename 전달 (필요시)
          // 만약 내 아바타도 filename 기반이면 myAvatar.split('/').pop() 등이 필요
          myAvatar || AVATAR_FALLBACK
        )}`,
      });
    } catch (err) {
      console.warn("[DM] notification skipped:", err);
    }

    setDraft("");
    inputRef.current?.focus();
  };

  // [추가] 이모지 삽입
  const insertEmoji = (emo: string) => {
    setDraft((t) => t + emo);
    inputRef.current?.focus();
    setEmojiOpen(false);
  };

  // [제거] 이미지 전송 관련 로직 (onPickFiles, openGallery, fileRef) 모두 제거

  // 엔터 전송
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 좌측 검색 필터
  // ✅ 좌측 목록에 최신 이름/아바타 반영
  const visibleThreads = useMemo(() => {
  const q = queryText.trim().toLowerCase();
  const withLabel = threads.map((t) => {
    const p = peopleMap[t.peerUid];
    const name = p?.name || t.peerUid.slice(0, 6);
    return { ...t, label: name, avatar: p?.avatar || DEFAULT_PROFILE_IMG };
  });
  return q ? withLabel.filter((r) => r.label.toLowerCase().includes(q)) : withLabel;
}, [threads, peopleMap, queryText]);


  return (
    <Page $dark={isDarkMode}>
      {/* Left */}
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
          style={{ ["--thumb" as any]: isDarkMode ? "#3a3f44" : "#cbd5e1" }}
        >
          {visibleThreads.length === 0 ? (
  <div className="text-gray-400 px-3 py-2">대상이 없습니다</div>
) : (
  visibleThreads.map((t) => {
    const lastTime = t.updatedAt ? formatTime(t.updatedAt) : "";
    const preview = t.lastMessage || (t.lastSenderId ? "새 메시지" : "대화 없음");
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
      src={t.avatar}
      onError={(e) => ((e.target as HTMLImageElement).src = DEFAULT_PROFILE_IMG)}
    />
  </StoryRing>
  <RowMain>
    <Uname $dark={isDarkMode}>{t.label}</Uname>
    <Preview $dark={isDarkMode}>{preview}</Preview>
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

      {/* Right */}
      <Right $dark={isDarkMode}>
        <ChatHeader $dark={isDarkMode}>
          {activePerson ? (
            <>
              <ChatUser $dark={isDarkMode}>
                <Avatar
                  $dark={isDarkMode}
                  src={activePerson.avatar || AVATAR_FALLBACK}
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src = AVATAR_FALLBACK)
                  }
                />
                <div>{activePerson.name}</div>
              </ChatUser>
              <div />
              <div
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <button
                  title="프로필"
                  onClick={() => navigate(`/user/${activePerson.uid}`)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: `1px solid ${
                      isDarkMode ? "#202327" : LIGHT_BORDER
                    }`,
                    background: "transparent",
                    color: isDarkMode ? "#e5e7eb" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  i
                </button>
              </div>
            </>
          ) : (
            <div style={{ paddingLeft: 12, fontWeight: 800 }}>대화 선택</div>
          )}
        </ChatHeader>

        {isThreadOpen ? (
          messages.length > 0 ? (
            <Messages
              ref={scrollRef}
              style={{ ["--thumb" as any]: isDarkMode ? "#3a3f44" : "#cbd5e1" }}
            >
              {messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const showDivider = !prev || !sameDay(prev.ts, m.ts);
                const mine = m.userId === myUid;
                return (
                  <React.Fragment key={m.id}>
                    {showDivider && (
                      <DayDivider $dark={isDarkMode}>
                        <span />
                        {new Date(m.ts).toLocaleDateString()}
                        <span />
                      </DayDivider>
                    )}
                    <BubbleWrap $mine={mine}>
                      <Bubble mine={mine}>{m.text}</Bubble>
                      <Time $dark={isDarkMode} $mine={mine}>
                        {formatTime(m.ts)}
                      </Time>
                    </BubbleWrap>
                  </React.Fragment>
                );
              })}
            </Messages>
          ) : (
            <EmptyState $dark={isDarkMode}>
              아직 메시지가 없습니다. 첫 메시지를 보내보세요.
            </EmptyState>
          )
        ) : (
          <EmptyState $dark={isDarkMode}>
            좌측에서 대화를 선택하거나 프로필에서 DM을 열어보세요.
          </EmptyState>
        )}

        {/* 입력창 및 팝오버 영역 (이미지 업로드 없음) */}
        {isThreadOpen && (
          <div style={{ position: "relative" }}>
            {/* 이모지 팝오버 */}
            {emojiOpen && (
              <EmojiPopover
                $dark={isDarkMode}
                role="dialog"
                aria-label="이모지 선택"
                onClick={(e) => e.stopPropagation()} // 팝오버 클릭시 안 닫히게
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

            {/* InputBar 레이웃 */}
            <InputBar
              $dark={isDarkMode}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              {/* 1. 이모지 버튼 */}
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

              {/* 2. 텍스트 박스 */}
              <Textbox
                ref={inputRef}
                $dark={isDarkMode}
                placeholder="메시지를 입력하세요…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
              />

              {/* 3. 전송 버튼 */}
              <Send type="submit" disabled={sendDisabled}>
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
