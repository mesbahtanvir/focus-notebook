import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment } from "firebase/firestore";
import { db, auth } from "../firebaseClient";

/**
 * Get current user ID, or "anon" if not authenticated
 */
function uid(): string {
  return auth.currentUser?.uid ?? "anon";
}

/**
 * Create a new document at the given path
 * Automatically adds createdAt, updatedAt, updatedBy, and version
 */
export async function createAt(path: string, data: any): Promise<void> {
  const ref = doc(db, path);
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid(),
    version: 1,
  });
}

/**
 * Set/merge document at the given path
 * Automatically updates updatedAt, updatedBy, and increments version
 */
export async function setAt(path: string, data: any): Promise<void> {
  const ref = doc(db, path);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: uid(),
      version: increment(1),
    },
    { merge: true }
  );
}

/**
 * Update specific fields in a document
 * Automatically updates updatedAt, updatedBy, and increments version
 */
export async function updateAt(path: string, partial: any): Promise<void> {
  const ref = doc(db, path);
  await updateDoc(ref, {
    ...partial,
    updatedAt: serverTimestamp(),
    updatedBy: uid(),
    version: increment(1),
  });
}

/**
 * Delete a document at the given path
 */
export async function deleteAt(path: string): Promise<void> {
  const ref = doc(db, path);
  await deleteDoc(ref);
}
