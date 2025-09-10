// src/components/RelationsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebaseConfig"; // ✅ 경로 수정
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type RelationsContextValue = {
  loading: boolean;
  isFollowing: (uid: string) => boolean;
  isMuted: (uid: string) => boolean;
  follow: (uid: string) => Promise<void>;
  unfollow: (uid: string) => Promise<void>;
  mute: (uid: string) => Promise<void>;
  unmute: (uid: string) => Promise<void>;
};

const RelationsContext = createContext<RelationsContextValue | null>(null);

const useMeRef = () => auth.currentUser?.uid ?? null;

export const RelationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  // 현재 로그인한 내 user_relations 문서 ref
  const refForMe = () => {
    const me = useMeRef();
    return me ? doc(db, "user_relations", me) : null;
  };

  // ✅ 로그인 상태 변화를 구독하여 Firestore 구독을 동적으로 연결/해제
  useEffect(() => {
    let unsubscribeRelations: (() => void) | null = null;

    const stopAuth = onAuthStateChanged(auth, (user) => {
      // 이전 구독 해제
      if (unsubscribeRelations) {
        unsubscribeRelations();
        unsubscribeRelations = null;
      }

      if (!user) {
        setFollowing(new Set());
        setMuted(new Set());
        setLoading(false);
        return;
      }

      const ref = doc(db, "user_relations", user.uid);
      unsubscribeRelations = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data() || {};
          setFollowing(new Set<string>(Array.isArray(data.following) ? data.following : []));
          setMuted(new Set<string>(Array.isArray(data.muted) ? data.muted : []));
          setLoading(false);
        },
        (err) => {
          console.error("[Relations] onSnapshot error:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      stopAuth();
      if (unsubscribeRelations) unsubscribeRelations();
    };
  }, []);

  const isFollowing = (uid: string) => following.has(uid);
  const isMuted = (uid: string) => muted.has(uid);

  const follow = async (targetUid: string) => {
    const me = useMeRef();
    if (!me || !targetUid || me === targetUid) return;
    const ref = refForMe();
    if (!ref) return;

    try {
      await setDoc(
        ref,
        {
          following: arrayUnion(targetUid),
          muted: arrayRemove(targetUid), // 팔로우 시 뮤트 해제(충돌 방지)
        },
        { merge: true }
      );
    } catch (e) {
      console.error("[Relations] follow 실패:", e);
      alert("팔로우에 실패했습니다. 권한/네트워크 상태를 확인하세요.");
    }
  };

  const unfollow = async (targetUid: string) => {
    const me = useMeRef();
    if (!me || !targetUid || me === targetUid) return;
    const ref = refForMe();
    if (!ref) return;

    try {
      await setDoc(
        ref,
        {
          following: arrayRemove(targetUid),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("[Relations] unfollow 실패:", e);
      alert("언팔로우에 실패했습니다. 권한/네트워크 상태를 확인하세요.");
    }
  };

  const mute = async (targetUid: string) => {
    const me = useMeRef();
    if (!me || !targetUid || me === targetUid) return;
    const ref = refForMe();
    if (!ref) return;

    try {
      await setDoc(
        ref,
        {
          muted: arrayUnion(targetUid),
          following: arrayRemove(targetUid), // 뮤트 시 팔로우 해제(충돌 방지)
        },
        { merge: true }
      );
    } catch (e) {
      console.error("[Relations] mute 실패:", e);
      alert("뮤트에 실패했습니다. 권한/네트워크 상태를 확인하세요.");
    }
  };

  const unmute = async (targetUid: string) => {
    const me = useMeRef();
    if (!me || !targetUid || me === targetUid) return;
    const ref = refForMe();
    if (!ref) return;

    try {
      await setDoc(
        ref,
        {
          muted: arrayRemove(targetUid),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("[Relations] unmute 실패:", e);
      alert("뮤트 해제에 실패했습니다. 권한/네트워크 상태를 확인하세요.");
    }
  };

  const value = useMemo<RelationsContextValue>(
    () => ({
      loading,
      isFollowing,
      isMuted,
      follow,
      unfollow,
      mute,
      unmute,
    }),
    [loading, following, muted]
  );

  return <RelationsContext.Provider value={value}>{children}</RelationsContext.Provider>;
};

export const useRelations = () => {
  const ctx = useContext(RelationsContext);
  if (!ctx) throw new Error("useRelations must be used within RelationsProvider");
  return ctx;
};
