// src/components/NotificationUtil.ts
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Firestore에 알림 문서를 하나 기록하는 공용 함수
 * notifications/{targetUid}/inbox/{autoId}
 */
async function pushNotifToFirestore(params: {
  targetUid: string;          // 알림을 받아야 할 사람
  kind: "follow" | "like" | "mention" | "dm" | "system";
  title: string;              // 카드에 큰 글씨로 나올 문장
  desc?: string;              // 작은 보조설명(댓글 내용 일부 등)
  avatar?: string;            // 알림에서 보여줄 프로필 썸네일
  link?: string;              // 알림 클릭 시 이동할 경로
  fromUid?: string;           // 누가 이 알림을 발생시켰는지
}) {
  if (!params.targetUid) return; // 방어 코드

  await addDoc(
    collection(db, "notifications", params.targetUid, "inbox"),
    {
      kind: params.kind,
      title: params.title,
      desc: params.desc || null,
      avatar: params.avatar || null,
      link: params.link || null,
      fromUid: params.fromUid || null,
      read: false,
      ts: serverTimestamp(), // Firestore 서버 시간이므로 신뢰 가능
    }
  );
}

/**
 * 팔로우 알림:
 * A(팔로워)가 B를 팔로우했을 때 B에게 "A님이 당신을 팔로우하기 시작했습니다"
 */
export async function notifyFollowFirestore(params: {
  targetUid: string;        // B: 팔로우 당한 사람
  followerUid: string;      // A: 팔로우 한 사람
  followerName?: string;
  followerAvatar?: string;
}) {
  if (!params.targetUid || !params.followerUid) return;

  await pushNotifToFirestore({
    targetUid: params.targetUid,
    kind: "follow",
    title: `${params.followerName ?? "새 사용자"} 님이 나를 팔로우하기 시작했습니다`,
    desc: undefined,
    avatar: params.followerAvatar,
    link: `/user/${params.followerUid}`,
    fromUid: params.followerUid,
  });
}

/**
 * 좋아요 알림:
 * A가 B의 게시글에 좋아요 눌렀을 때
 */
export async function notifyLikeFirestore(params: {
  postId: string;
  postTitle?: string;
  ownerUid: string;     // B: 글 주인 (알림 받을 사람)
  actorUid: string;     // A: 좋아요 누른 사람
  actorName?: string;
  actorAvatar?: string;
}) {
  if (!params.ownerUid || !params.actorUid) return;
  if (params.ownerUid === params.actorUid) return; // 자기 글에 자기 좋아요면 알림 X

  const desc = params.postTitle
    ? `「${params.postTitle.slice(0, 40)}」`
    : undefined;

  await pushNotifToFirestore({
    targetUid: params.ownerUid,
    kind: "like",
    title: `${params.actorName ?? "익명"} 님이 내 글을 좋아합니다`,
    desc,
    avatar: params.actorAvatar,
    link: `/post/${params.postId}`,
    fromUid: params.actorUid,
  });
}

/**
 * 댓글 알림:
 * A가 B의 게시글에 댓글 남겼을 때
 */
export async function notifyCommentFirestore(params: {
  postId: string;
  postTitle?: string;
  ownerUid: string;     // B: 글 주인
  actorUid: string;     // A: 댓글 단 사람
  actorName?: string;
  actorAvatar?: string;
  commentText?: string;
}) {
  if (!params.ownerUid || !params.actorUid) return;
  if (params.ownerUid === params.actorUid) return; // 자기 글에 자기 댓글이면 알림 X

  let pieces: string[] = [];
  if (params.postTitle) {
    pieces.push(`「${params.postTitle.slice(0, 40)}」`);
  }
  if (params.commentText) {
    pieces.push(params.commentText.slice(0, 60));
  }
  const desc = pieces.join(" · ");

  await pushNotifToFirestore({
    targetUid: params.ownerUid,
    kind: "mention",
    title: `${params.actorName ?? "익명"} 님이 내 글에 댓글을 남겼습니다`,
    desc,
    avatar: params.actorAvatar,
    link: `/post/${params.postId}#comments`,
    fromUid: params.actorUid,
  });
}
export async function notifyDmFirestore(params: {
  targetUid: string;   // DM을 "받는" 사람
  fromUid: string;     // 보낸 사람(나)
  fromName?: string;
  fromAvatar?: string;
  text?: string;
}) {
  if (!params.targetUid || !params.fromUid) return;

  await pushNotifToFirestore({
    targetUid: params.targetUid,
    kind: "dm",
    title: `${params.fromName ?? "익명"} 님으로부터 새 메시지`,
    desc: (params.text ?? "").slice(0, 80),
    avatar: params.fromAvatar,
    link: `/dm?uid=${params.fromUid}&name=${encodeURIComponent(
      params.fromName ?? "사용자"
    )}&avatar=${encodeURIComponent(params.fromAvatar ?? "")}`,
    fromUid: params.fromUid,
  });
}