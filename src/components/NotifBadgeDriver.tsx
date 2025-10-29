// src/components/NotifBadgeDriver.tsx
import { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ====== DM 알림 유틸 ======
function pushLocalDmNotification(params: {
  targetUid: string;
  title: string;
  desc?: string;
  avatar?: string;
  link?: string;
}) {
  const key = `notif_inbox_${params.targetUid}`;
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
    // 배지 이벤트 전송
    window.dispatchEvent(new CustomEvent("notif_inbox_updated", { detail: {} }));
    window.dispatchEvent(new Event("notif_inbox_updated"));
  } catch (e) {
    console.error("pushLocalDmNotification error:", e);
  }
}

// ====== 로컬 DM 인박스 읽기 ======
function readLocalInbox(uid: string | null) {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`notif_inbox_${uid}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ====== 배지 갱신 ======
function publishBadge(unread: number) {
  try {
    localStorage.setItem("notif_unread_count", String(unread));
    window.dispatchEvent(new CustomEvent("notif_inbox_updated", { detail: { unread } }));
    window.dispatchEvent(new Event("notif_inbox_updated"));
  } catch {}
}

export default function NotifBadgeDriver() {
  const [uid, setUid] = useState<string | null>(getAuth().currentUser?.uid ?? null);
  const latestDmTs = useRef<number>(0);

  // 로그인 감시
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
    return () => unsub();
  }, []);

  // Firestore 알림 + 로컬 DM 합산
  useEffect(() => {
    if (!uid) {
      publishBadge(0);
      return;
    }

    const qRef = query(collection(db, "notifications", uid, "inbox"), orderBy("ts", "desc"));
    const unsubFs = onSnapshot(qRef, (snap) => {
      let unreadFs = 0;
      for (const d of snap.docs) {
        const x: any = d.data();
        if (!x?.read) unreadFs++;
      }
      const local = readLocalInbox(uid);
      const unreadLocal = local.filter((x: any) => !x?.read).length;
      publishBadge(unreadFs + unreadLocal);
    });

    const onLocal = () => {
      const local = readLocalInbox(uid);
      const unreadLocal = local.filter((x: any) => !x?.read).length;
      const prev = Number(localStorage.getItem("notif_unread_count") || "0");
      publishBadge(Math.max(prev, unreadLocal));
    };

    window.addEventListener("notif_inbox_updated", onLocal);
    return () => {
      unsubFs();
      window.removeEventListener("notif_inbox_updated", onLocal);
    };
  }, [uid]);

  // ✅ DM 실시간 구독 추가 (핵심 패치)
  useEffect(() => {
    if (!uid) return;

    // DM 컬렉션 구조에 따라 수정
    // 여기서는 messages 컬렉션에 toUid == 내 uid 인 새 메시지를 감시
    const qDm = query(
      collection(db, "dm_messages"),
      where("toUid", "==", uid),
      orderBy("ts", "desc"),
      limit(20)
    );

    const unsubDm = onSnapshot(qDm, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const data = change.doc.data() as any;

        const fromUid = data.fromUid || data.userId;
        if (!fromUid || fromUid === uid) return; // 내가 보낸 건 무시

        const ts = data.ts?.toMillis?.() ?? data.ts ?? Date.now();

        // 이미 같은 ts 이후의 DM을 처리한 경우는 건너뜀
        if (ts <= latestDmTs.current) return;
        latestDmTs.current = ts;

        pushLocalDmNotification({
          targetUid: uid,
          title: data.userName || "새 메시지",
          desc: data.text || "새 DM이 도착했습니다",
          avatar: data.userPhoto || undefined,
          link: `/dm?peer=${fromUid}`,
        });
      });
    });

    return () => unsubDm();
  }, [uid]);

  return null;
}
