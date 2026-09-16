// IndexedDB queue for messages sent while offline.
// The SW flushes via background-sync; the client also flushes on 'online'.

const DB_NAME = "nomarc-offline";
const STORE = "pending-messages";
const DB_VERSION = 1;

export interface QueuedMessage {
  id: number; // autoIncrement key
  conversationId: string;
  body: string;
  type: string;
  attachmentUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  queuedAt: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function enqueue(msg: Omit<QueuedMessage, "id">): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(msg);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  // Register background sync so the SW can flush when connectivity returns
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (reg && "sync" in reg) {
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
        .sync.register("send-messages").catch(() => {});
    }
  }
}

export async function dequeue(id: number): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

export async function getPending(): Promise<QueuedMessage[]> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result as QueuedMessage[]);
    req.onerror = () => rej(req.error);
  });
}
