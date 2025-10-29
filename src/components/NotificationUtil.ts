// src/components/NotificationUtil.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

type NotifKind = "like" | "mention" | "follow" | "dm" | "system";

type PushParams = {
  targetUid: string;          // 알림을 받을 유저
  kind: NotifKind;            // 알림 종류
  title: string;              // 큰 문구
  desc?: string;              // 부가 설명 (댓글 일부 등)
  avatar?: string;            // 카드 썸네일 (프로필 등)
  link?: string;              // 클릭 시 이동 경로
  fromUid?: string;           // 알림을 유발한 주체(보낸 사람)
};

/** 공통: Firestore에 알림 쓰기 (규칙 요구 필드 충족: kind/title/read/ts) */
export async function pushNotifToFirestore(p: PushParams) {
  if (!p?.targetUid) return;
  await addDoc(collection(db, "notifications", p.targetUid, "inbox"), {
    kind: p.kind,
    title: p.title,
    desc: p.desc ?? null,
    avatar: p.avatar ?? null,
    link: p.link ?? null,
    fromUid: p.fromUid ?? null,
    read: false,                 // ✅ 규칙 필수
    ts: serverTimestamp(),       // ✅ 규칙 필수
  });
}

/** 좋아요 알림 */
export async function notifyLikeFirestore(params: {
  targetUid: string;
  actorUid: string;
  actorName?: string;
  actorAvatar?: string;
  postId?: string;
}) {
  const { targetUid, actorUid, actorName, actorAvatar, postId } = params;
  await pushNotifToFirestore({
    targetUid,
    kind: "like",
    title: `${actorName ?? "사용자"} 님이 내 글에 좋아요를 눌렀습니다`,
    desc: undefined,
    avatar: actorAvatar,
    link: postId ? `/post/${postId}` : undefined,
    fromUid: actorUid,
  });
}

/** 댓글(멘션) 알림 */
export async function notifyCommentFirestore(params: {
  targetUid: string;
  actorUid: string;
  actorName?: string;
  actorAvatar?: string;
  postId?: string;
  text?: string;
}) {
  const { targetUid, actorUid, actorName, actorAvatar, postId, text } = params;
  await pushNotifToFirestore({
    targetUid,
    kind: "mention", // ← 화면 쪽에서 comment→mention 매핑, 여기선 바로 mention 사용
    title: `${actorName ?? "사용자"} 님이 내 글에 댓글을 남겼습니다`,
    desc: (text ?? "").slice(0, 80),
    avatar: actorAvatar,
    link: postId ? `/post/${postId}` : undefined,
    fromUid: actorUid,
  });
}

/** 팔로우 알림 */
export async function notifyFollowFirestore(params: {
  targetUid: string;
  actorUid: string;
  actorName?: string;
  actorAvatar?: string;
}) {
  const { targetUid, actorUid, actorName, actorAvatar } = params;
  await pushNotifToFirestore({
    targetUid,
    kind: "follow",
    title: `${actorName ?? "사용자"} 님이 나를 팔로우했습니다`,
    desc: undefined,
    avatar: actorAvatar,
    link: `/user/${actorUid}`,
    fromUid: actorUid,
  });
}

/** DM 알림 */
export async function notifyDmFirestore(params: {
  targetUid: string;        // DM을 받는 사람(상대)
  fromUid: string;          // 보낸 사람(나)
  fromName?: string;
  fromAvatar?: string;
  text?: string;
}) {
  const { targetUid, fromUid, fromName, fromAvatar, text } = params;
  await pushNotifToFirestore({
    targetUid,
    kind: "dm",
    title: `${fromName ?? "익명"} 님으로부터 새 메시지`,
    desc: (text ?? "").slice(0, 80),
    avatar: fromAvatar,
    link: `/dm?uid=${fromUid}`,
    fromUid,
  });
}
export function pushLocalDmNotification(params: {
  targetUid: string;           // 알림을 받아야 할 사람(현재 로그인 유저 uid)
  title: string;
  desc?: string;
  avatar?: string;
  link?: string;               // 예: `/dm?peer=${peerUid}`
}) {
  if (typeof window === "undefined") return;
  const key = params.targetUid ? `notif_inbox_${params.targetUid}` : `notif_inbox_guest`;
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    const id = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    arr.unshift({
      id,
      kind: "dm",
      title: params.title,
      desc: params.desc,
      ts: Date.now(),
      read: false,
      avatar: params.avatar,
      link: params.link,
    });
    localStorage.setItem(key, JSON.stringify(arr));
    // 좌측 배지 즉시 갱신
    window.dispatchEvent(new CustomEvent("notif_inbox_updated", { detail: {} }));
    window.dispatchEvent(new Event("notif_inbox_updated"));
  } catch {}
}