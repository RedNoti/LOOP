import { getAuth } from "firebase/auth";

/* ===== 타입 ===== */
export type Kind = "mention" | "like" | "dm" | "system";
export type Item = {
  id: string;
  kind: Kind;
  title: string;
  desc?: string;
  ts: number;
  read?: boolean;
  avatar?: string;
  link?: string;
};

export type Priority = "mentions" | "dm" | "all";
export type NotiSettings = {
  push: boolean; // 브라우저 푸시 허용
  sound: boolean; // 효과음 허용
  post: boolean; // ✅ 포스트(좋아요/멘션) 허용
  dm: boolean; // ✅ DM 허용
  priority: Priority; // (선택) 푸시 우선순위
};

const SETTINGS_KEY = "notif_settings";
const inboxKey = (uid?: string | null) =>
  uid ? `notif_inbox_${uid}` : `notif_inbox_guest`;

/* ===== 설정 로드/저장 ===== */
export const loadSettings = (): NotiSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return {
      push: !!p.push,
      sound: typeof p.sound === "boolean" ? p.sound : true,
      post: typeof p.post === "boolean" ? p.post : true,
      dm: typeof p.dm === "boolean" ? p.dm : true,
      priority: (["mentions", "dm", "all"] as Priority[]).includes(p.priority)
        ? p.priority
        : "mentions",
    };
  } catch {
    return {
      push: false,
      sound: true,
      post: true,
      dm: true,
      priority: "mentions",
    };
  }
};
export const saveSettings = (cfg: NotiSettings) =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));

/* ===== Inbox 유틸 ===== */
export const loadInbox = (uid?: string | null): Item[] => {
  try {
    const raw = localStorage.getItem(inboxKey(uid));
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
};
export const saveInbox = (uid: string | null | undefined, list: Item[]) =>
  localStorage.setItem(inboxKey(uid), JSON.stringify(list));

/* ===== 효과음 (간단 비프) ===== */
export const playBeep = (enabled: boolean) => {
  if (!enabled) return;
  const AC: any =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  osc.connect(g);
  g.connect(ctx.destination);
  g.gain.value = 0.001;
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25);
  osc.stop(ctx.currentTime + 0.26);
};

/* ===== 브라우저 푸시 ===== */
const canPush = () => "Notification" in window;
const tryPush = (cfg: NotiSettings, item: Item) => {
  if (!cfg.push || !canPush()) return;
  if (Notification.permission !== "granted") return;

  // (선택) 우선순위 제한
  const priorityOK =
    cfg.priority === "all"
      ? true
      : cfg.priority === "dm"
      ? item.kind === "dm"
      : item.kind === "mention"; // "mentions"
  if (!priorityOK) return;

  new Notification(item.title || "알림", {
    body: item.desc,
    silent: !cfg.sound,
    icon: item.avatar,
  });
};

/* ===== 토글 검사(세팅에 따라 생성 자체 차단) ===== */
const passesToggles = (kind: Kind, cfg: NotiSettings) => {
  if (kind === "dm") return cfg.dm;
  if (kind === "mention" || kind === "like") return cfg.post;
  return true; // system 등은 허용
};

/* ===== 공개 API: emit(단일 진입점) =====
   → 세팅 토글을 통과 못하면 알림함에 생성하지 않음 */
export const emit = (partial: Omit<Item, "id" | "ts" | "read">) => {
  const cfg = loadSettings();
  if (!passesToggles(partial.kind, cfg)) return null;

  const uid = getAuth().currentUser?.uid ?? null;
  const item: Item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    read: false,
    ...partial,
  };

  const cur = loadInbox(uid);
  cur.unshift(item);
  saveInbox(uid, cur);

  tryPush(cfg, item);
  playBeep(cfg.sound);
  return item;
};

/* ===== 편의 래퍼 ===== */
export const notify = {
  like: (p: Omit<Item, "id" | "ts" | "read" | "kind">) =>
    emit({ kind: "like", ...p }),
  mention: (p: Omit<Item, "id" | "ts" | "read" | "kind">) =>
    emit({ kind: "mention", ...p }),
  dm: (p: Omit<Item, "id" | "ts" | "read" | "kind">) =>
    emit({ kind: "dm", ...p }),
  system: (p: Omit<Item, "id" | "ts" | "read" | "kind">) =>
    emit({ kind: "system", ...p }),
};
