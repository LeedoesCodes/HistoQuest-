import type { ArcId, BehaviorEvent, BehaviorEventType } from "@shared/types";
import { supabase } from "@shared/supabase";

/**
 * BehaviorLogger — records every interaction the engagement classifier needs.
 *
 * Resilience (per the manuscript's hybrid design): every event is written to
 * IndexedDB immediately, so a connectivity drop or a crash never loses data.
 * flush() best-effort syncs buffered events to Supabase and marks them sent.
 * If Supabase isn't configured (dev), it stays local — you are never blocked.
 */

const DB_NAME = "basaquest";
const STORE = "behavior_events";

interface StoredEvent extends BehaviorEvent {
  _localId: number; // IndexedDB autoIncrement key
  _sent: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "_localId", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export class BehaviorLogger {
  readonly sessionId: string;
  private events: BehaviorEvent[] = [];
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly pupilId: string,
    private readonly arc: ArcId,
    sessionId?: string
  ) {
    this.sessionId = sessionId ?? crypto.randomUUID();
    // IndexedDB may be unavailable (private mode, etc.) — degrade gracefully.
    try {
      this.dbPromise = openDb();
    } catch {
      this.dbPromise = null;
    }
  }

  /** Record one event. Kept in memory and persisted to IndexedDB. */
  async log(
    type: BehaviorEventType,
    nodeId: string,
    payload: Record<string, number | string | boolean> = {}
  ): Promise<void> {
    const event: BehaviorEvent = {
      pupilId: this.pupilId,
      arc: this.arc,
      sessionId: this.sessionId,
      ts: new Date().toISOString(),
      type,
      nodeId,
      payload,
    };
    this.events.push(event);
    await this.persist(event);
  }

  private async persist(event: BehaviorEvent): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      await new Promise<void>((resolve, reject) => {
        const store = tx(db, "readwrite");
        const req = store.add({ ...event, _sent: false } as Omit<StoredEvent, "_localId">);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Persistence is best-effort; the in-memory copy still drives the result.
    }
  }

  /** All events logged this session (drives result + feature extraction). */
  getEvents(): readonly BehaviorEvent[] {
    return this.events;
  }

  /**
   * Best-effort push of unsent events to Supabase. Safe to call anytime;
   * a no-op when Supabase isn't configured or the network is down.
   * Returns the number of events synced.
   */
  async flush(): Promise<number> {
    if (!supabase || !this.dbPromise) return 0;
    let db: IDBDatabase;
    try {
      db = await this.dbPromise;
    } catch {
      return 0;
    }

    const unsent = await new Promise<StoredEvent[]>((resolve) => {
      const out: StoredEvent[] = [];
      const store = tx(db, "readonly");
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const v = cursor.value as StoredEvent;
          if (!v._sent) out.push(v);
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      cursorReq.onerror = () => resolve(out);
    });

    if (unsent.length === 0) return 0;

    const rows = unsent.map((e) => ({
      session_id: e.sessionId,
      pupil_id: e.pupilId,
      arc: e.arc,
      ts: e.ts,
      type: e.type,
      node_id: e.nodeId,
      payload: e.payload,
    }));

    const { error } = await supabase.from("history_behavior_logs").insert(rows);
    if (error) return 0; // stays unsent; retried on next flush

    // Mark synced so we don't double-insert.
    await new Promise<void>((resolve) => {
      const store = tx(db, "readwrite");
      unsent.forEach((e) => store.put({ ...e, _sent: true }));
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => resolve();
    });
    return unsent.length;
  }
}
