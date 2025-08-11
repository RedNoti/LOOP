// src/components/RelationsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";

type RelationsState = {
  following: Set<string>;
  muted: Set<string>;
  loading: boolean;
  follow: (targetUid: string) => Promise<void>;
  unfollow: (targetUid: string) => Promise<void>;
  mute: (targetUid: string) => Promise<void>;
  unmute: (targetUid: string) => Promise<void>;
  isFollowing: (uid: string) => boolean;
  isMuted: (uid: string) => boolean;
};

const RelationsContext = createContext<RelationsState | null>(null);

export const RelationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setFollowing(new Set());
      setMuted(new Set());
      setLoading(false);
      return;
    }

    const ref = doc(db, "user_relations", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      setFollowing(new Set<string>(data.following || []));
      setMuted(new Set<string>(data.muted || []));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const refForMe = () => doc(db, "user_relations", auth.currentUser!.uid);

  const follow = async (targetUid: string) => {
    if (!auth.currentUser || targetUid === auth.currentUser.uid) return;
    const ref = refForMe();
    await setDoc(
      ref,
      { following: arrayUnion(targetUid), muted: arrayRemove(targetUid) },
      { merge: true }
    );
  };

  const unfollow = async (targetUid: string) => {
    if (!auth.currentUser || targetUid === auth.currentUser.uid) return;
    const ref = refForMe();
    await setDoc(ref, { following: arrayRemove(targetUid) }, { merge: true });
  };

  const mute = async (targetUid: string) => {
    if (!auth.currentUser || targetUid === auth.currentUser.uid) return;
    const ref = refForMe();
    await setDoc(
      ref,
      { muted: arrayUnion(targetUid), following: arrayRemove(targetUid) },
      { merge: true }
    );
  };

  const unmute = async (targetUid: string) => {
    if (!auth.currentUser || targetUid === auth.currentUser.uid) return;
    const ref = refForMe();
    await setDoc(ref, { muted: arrayRemove(targetUid) }, { merge: true });
  };

  const value = useMemo<RelationsState>(
    () => ({
      following,
      muted,
      loading,
      follow,
      unfollow,
      mute,
      unmute,
      isFollowing: (uid) => following.has(uid),
      isMuted: (uid) => muted.has(uid),
    }),
    [following, muted, loading]
  );

  return <RelationsContext.Provider value={value}>{children}</RelationsContext.Provider>;
};

export const useRelations = () => {
  const ctx = useContext(RelationsContext);
  if (!ctx) throw new Error("useRelations must be used within RelationsProvider");
  return ctx;
};
