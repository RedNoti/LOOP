// src/components/NotificationUtil.ts

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";


/* =========================
   타입 정의
   ========================= */
export type NotifKind = "mention" | "like" | "system" | "dm" | "follow";

export type NotifItem = {
  id: string;        // 고유 ID (예: "follow:uid:timestamp")
  kind: NotifKind;   // 알림 종류
  title: string;     // 예: "OOO 님이 나를 팔로우하기 시작했습니다"
  desc?: string;     // 부가 설명 (댓글 내용 일부 등)
  ts: number;        // Date.now() 결과 (로컬용)
  read?: boolean;
  avatar?: string;   // 알림에 표시할 프로필 이미지 URL
  link?: string;     // 클릭 시 이동할 경로 (예: "/post/123")
};

/* =========================
   localStorage 기반 inbox 유틸
   ========================= */

// 유저 uid를 이용해 localStorage key를 만들어줌
const inboxKey = (uid?: string | null) =>
  uid ? `notif_inbox_${uid}` : `notif_inbox_guest`;

// localStorage에서 현재 알림함(inbox) 불러오기
const loadInbox = (uid?: string | null): NotifItem[] => {
  try {
    const raw = localStorage.getItem(inboxKey(uid));
    return raw ? (JSON.parse(raw) as NotifItem[]) : [];
  } catch {
    return [];
  }
};

// inbox 내용을 localStorage에 저장하고,
// 브라우저 전체(다른 컴포넌트)에게 "업데이트 됐어!" 라고 알려줌
const saveInbox = (uid: string | null | undefined, list: NotifItem[]) => {
  localStorage.setItem(inboxKey(uid), JSON.stringify(list));
  window.dispatchEvent(new Event("notif_inbox_updated"));
};

// 실제로 알림 1개를 inbox에 푸시하는 함수
// - 같은 kind+title이 10분 안에 또 오면 중복 저장 방지
const pushItem = (ownerUid: string | null | undefined, item: NotifItem) => {
  const inbox = loadInbox(ownerUid);
  const now = item.ts;
  const tenMin = 10 * 60 * 1000;

  const dup = inbox.find(
    (x) =>
      x.kind === item.kind &&
      x.title === item.title &&
      now - x.ts < tenMin
  );

  if (!dup) {
    const next = [item, ...inbox].slice(0, 200); // 최대 200개만 유지
    saveInbox(ownerUid, next);
  }
};

// 문자열 너무 길면 "..." 처리
const cut = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) + "…" : s;

/* =========================
   알림 함수들
   ========================= */

/**
 * 1) DM 알림
 *    - DM 받은 사람(targetUid)의 inbox에
 *      "XXX 님이 새 메시지를 보냈습니다" 형태로 저장
 */
export function notifyDM(params: {
  targetUid: string;        // DM을 받은 사람 (알림 받을 쪽)
  senderUid: string;        // DM을 보낸 사람
  senderName?: string;
  senderAvatar?: string;
  previewText?: string;     // DM 내용 일부
  link?: string;            // DM 화면으로 이동할 링크
}) {
  const now = Date.now();
  if (!params.targetUid || params.targetUid === params.senderUid) return;

  pushItem(params.targetUid, {
    id: `dm:${params.senderUid}:${now}`,
    kind: "dm",
    title: `${params.senderName ?? "익명"} 님이 새 메시지를 보냈습니다`,
    desc: params.previewText
      ? (params.previewText.length > 60
          ? params.previewText.slice(0, 60) + "…"
          : params.previewText)
      : undefined,
    ts: now,
    read: false,
    avatar: params.senderAvatar,
    link: params.link ?? `/dm?with=${params.senderUid}`,
  });
}

/**
 * 2) 좋아요 알림
 *    - 글 주인(ownerUid)에게
 *      "누가 내 글을 좋아합니다" 형태로 저장
 */
export function notifyLike(params: {
  postId: string;
  postTitle?: string;
  ownerUid: string;      // 알림 받을 사람 (글 작성자)
  actorUid: string;      // 좋아요 누른 사람
  actorName?: string;
  actorAvatar?: string;
  link?: string;
}) {
  const now = Date.now();
  if (!params.ownerUid || params.ownerUid === params.actorUid) return;

  pushItem(params.ownerUid, {
    id: `like:${params.postId}:${params.actorUid}:${now}`,
    kind: "like",
    title: `${params.actorName ?? "익명"} 님이 내 글을 좋아합니다`,
    desc: params.postTitle ? `「${cut(params.postTitle, 40)}」` : undefined,
    ts: now,
    read: false,
    avatar: params.actorAvatar,
    link: params.link ?? `/post/${params.postId}`,
  });
}

/**
 * 3) 댓글/멘션 알림
 *    - 글 주인(ownerUid)에게
 *      "누가 내 글에 댓글을 남겼습니다" 형태로 저장
 */
export function notifyComment(params: {
  postId: string;
  postTitle?: string;
  ownerUid: string;      // 알림 받을 사람 (글 작성자)
  actorUid: string;      // 댓글 단 사람
  actorName?: string;
  actorAvatar?: string;
  commentText?: string;
  link?: string;
}) {
  const now = Date.now();
  if (!params.ownerUid || params.ownerUid === params.actorUid) return;

  const pieces: string[] = [];
  if (params.postTitle) {
    pieces.push(`「${cut(params.postTitle, 40)}」`);
  }
  if (params.commentText) {
    pieces.push(cut(params.commentText, 60));
  }

  pushItem(params.ownerUid, {
    id: `cmt:${params.postId}:${params.actorUid}:${now}`,
    kind: "mention",
    title: `${params.actorName ?? "익명"} 님이 내 글에 댓글을 남겼습니다`,
    desc: pieces.join(" · "),
    ts: now,
    read: false,
    avatar: params.actorAvatar,
    link: params.link ?? `/post/${params.postId}#comments`,
  });
}

/**
 * 4) 팔로우 알림 (localStorage 버전)
 *    - 팔로우 "당한" 사람(targetUid)의 로컬 inbox에
 *      "XXX 님이 나를 팔로우하기 시작했습니다" 저장
 *
 *    이건 즉각적인 탭 내 뱃지 업데이트용.
 *    단점: 이 브라우저의 localStorage에만 기록되므로
 *          당한 사람이 "다른 브라우저"에서 로그인하면 이건 안 보임.
 */
export function notifyFollow(params: {
  targetUid: string;        // 팔로우 "당한" 사람 (알림 받아야 할 사람)
  followerUid: string;      // 팔로우한 사람 (나)
  followerName?: string;
  followerAvatar?: string;
}) {
  const now = Date.now();
  if (!params.targetUid || params.targetUid === params.followerUid) return;

  pushItem(params.targetUid, {
    id: `follow:${params.followerUid}:${now}`,
    kind: "follow",
    title: `${params.followerName ?? "새 사용자"} 님이 나를 팔로우하기 시작했습니다`,
    desc: undefined,
    ts: now,
    read: false,
    avatar: params.followerAvatar,
    // 알림에서 클릭 시 그 팔로워의 프로필로 이동
    link: `/user/${params.followerUid}`,
  });
}

/**
 * 5) 팔로우 알림 (Firestore 버전)
 *    - **중요**: 이게 진짜 "서버에 남는" 알림
 *    - recipientUid == targetUid 로 저장
 *    - notification.tsx에서 onSnapshot(recipientUid == 내 uid)로 구독하면
 *      어느 브라우저에서든 즉시 보이게 됨
 */
export async function notifyFollowFirestore(params: {
  targetUid: string;    // 팔로우 당한 사람
  followerUid: string;  // 팔로우 건 사람
  followerName?: string;
  followerAvatar?: string;
}) {
  if (!params.targetUid || params.targetUid === params.followerUid) return;

  try {
    await addDoc(collection(db, "notifications"), {
      recipientUid: params.targetUid,      // 누가 받아야 하는지
      senderUid: params.followerUid,       // 누가 나를 팔로우했는지
      kind: "follow",
      title: `${params.followerName ?? "새 사용자"} 님이 나를 팔로우하기 시작했습니다`,
      desc: null,
      ts: serverTimestamp(),
      read: false,
      avatar: params.followerAvatar ?? null,
      link: `/user/${params.followerUid}`,
    });
  } catch (err) {
    console.error("[notifyFollowFirestore] Firestore 저장 실패:", err);
  }
}
