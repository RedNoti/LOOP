// src/components/NotificationUtil.ts

// 알림 유형들: 좋아요, 댓글(mention처럼 다룸), 시스템용, DM, 그리고 이번에 추가할 follow
export type NotifKind = "mention" | "like" | "system" | "dm" | "follow";

// 실제로 localStorage에 저장되는 알림 1개 형식
export type NotifItem = {
  id: string;        // 고유 ID (예: "follow:uid:timestamp")
  kind: NotifKind;   // 알림 종류
  title: string;     // "OOO님이 나를 팔로우하기 시작했습니다" 같은 문장
  desc?: string;     // 부가 설명 (예: 댓글 내용 일부)
  ts: number;        // 언제 발생했는지 (Date.now() 결과)
  read?: boolean;    // 읽음 여부 (지금은 안 쓸 수도 있음)
  avatar?: string;   // 알림에 표시할 프로필 이미지 URL
  link?: string;     // 클릭 시 이동할 경로 (예: "/post/123")
};

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

// inbox 내용을 localStorage에 저장하고, 브라우저 전체에 "업데이트됐어!" 라고 알려줌
const saveInbox = (uid: string | null | undefined, list: NotifItem[]) => {
  localStorage.setItem(inboxKey(uid), JSON.stringify(list));
  // 알림 뱃지를 실시간으로 업데이트시키기 위한 커스텀 이벤트
  window.dispatchEvent(new Event("notif_inbox_updated"));
};

// 실제로 알림 1개를 inbox에 "푸시"하는 함수
// - 같은 종류(kind)+같은 title이 10분 안에 또 오면 중복으로 안 넣도록 막아줌
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
    // 새 알림을 맨 앞에 넣고, 최대 200개까지만 유지
    const next = [item, ...inbox].slice(0, 200);
    saveInbox(ownerUid, next);
  }
};

// 문자열 너무 길면 "..." 처리
const cut = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) + "…" : s;

/* =========================
   기존 post.tsx에서 쓰던 것들
   ========================= */

// 좋아요 알림
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

  // 내 글에 내가 좋아요 눌렀을 땐 알림 보내지 않음
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

// 댓글 알림
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

  // 내 글에 내가 댓글 달았을 땐 알림 보내지 않음
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

/* =========================
   🔥 새로 추가할 팔로우 알림
   ========================= */

export function notifyFollow(params: {
  targetUid: string;        // 팔로우 "당한" 사람 (알림 받아야 할 사람)
  followerUid: string;      // 팔로우한 사람 (나)
  followerName?: string;
  followerAvatar?: string;
}) {
  const now = Date.now();

  // 스스로 자기 자신을 팔로우하는 상황은 무시
  if (!params.targetUid || params.targetUid === params.followerUid) return;

  pushItem(params.targetUid, {
    id: `follow:${params.followerUid}:${now}`,
    kind: "follow",
    title: `${params.followerName ?? "새 사용자"} 님이 나를 팔로우하기 시작했습니다`,
    desc: undefined,
    ts: now,
    read: false,
    avatar: params.followerAvatar,
    // 알림에서 클릭 시 그 팔로워의 프로필로 이동하게
    link: `/user/${params.followerUid}`,
  });
}
