import { onSnapshot, query, CollectionReference, DocumentReference, Query } from "firebase/firestore";

export interface SnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/**
 * Subscribe to a single document
 * Returns unsubscribe function
 */
export function subscribeDoc<T>(
  ref: DocumentReference,
  cb: (data: T | null, meta: SnapshotMeta) => void
): () => void {
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      const data = snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
      const meta = {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      };
      cb(data, meta);
    },
    (error) => {
      console.error('Document subscription error:', error);
    }
  );
}

/**
 * Subscribe to a collection/query
 * Returns unsubscribe function
 */
export function subscribeCol<T>(
  q: Query,
  cb: (rows: T[], meta: SnapshotMeta) => void
): () => void {
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      const meta = {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      };
      cb(rows, meta);
    },
    (error) => {
      console.error('Collection subscription error:', error);
    }
  );
}
