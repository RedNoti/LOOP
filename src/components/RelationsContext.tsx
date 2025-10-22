// src/components/RelationsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { auth, db } from "../firebaseConfig";
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

export const RelationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  const me = auth.currentUser?.uid ?? null;

  useEffect(() => {
    let unsubscribeRelations: (() => void) | null = null;
    const stopAuth = onAuthStateChanged(auth, (user) => {
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
          setFollowing(
            new Set<string>(Array.isArray(data.following) ? data.following : [])
          );
          setMuted(
            new Set<string>(Array.isArray(data.muted) ? data.muted : [])
          );
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

  const isFollowing = useCallback((uid: string) => following.has(uid), [following]);
  const isMuted = useCallback((uid: string) => muted.has(uid), [muted]);

  const applyPatch = useCallback(async (patch: Record<string, any>) => {
    if (!me) return;
    const ref = doc(db, "user_relations", me);
    try {
      await setDoc(ref, patch, { merge: true });
    } catch (e) {
      console.error("[Relations] setDoc 실패:", e);

      alert("요청 처리에 실패했습니다. 네트워크/권한을 확인하세요.");
   }
  }, [me]);

  const follow = useCallback(async (targetUid: string) => {
    if (!me || !targetUid || me === targetUid) return;
    await applyPatch({
      following: arrayUnion(targetUid),
      muted: arrayRemove(targetUid),
    });
  }, [me, applyPatch]);

  const unfollow = useCallback(async (targetUid: string) => {
    if (!me || !targetUid || me === targetUid) return;
    await applyPatch({
      following: arrayRemove(targetUid),
    });
  }, [me, applyPatch]);

  const mute = useCallback(async (targetUid: string) => {
    if (!me || !targetUid || me === targetUid) return;
    await applyPatch({
      muted: arrayUnion(targetUid),
      following: arrayRemove(targetUid),
    });
  }, [me, applyPatch]);

  const unmute = useCallback(async (targetUid: string) => {
    if (!me || !targetUid || me === targetUid) return;
    await applyPatch({
      muted: arrayRemove(targetUid),
    });
  }, [me, applyPatch]);
  const value = useMemo<RelationsContextValue>(() => ({
    loading,
    isFollowing,
    isMuted,
    follow,
    unfollow,
    mute,
    unmute,
  }), [loading, isFollowing, isMuted, follow, unfollow, mute, unmute]);
  return (
    <RelationsContext.Provider value={value}>
      {children}
    </RelationsContext.Provider>
  );
};

export const useRelations = () => {
  const ctx = useContext(RelationsContext);
  if (!ctx)
    throw new Error("useRelations must be used within RelationsProvider");
  return ctx;
};
