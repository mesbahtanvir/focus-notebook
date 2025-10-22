import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment } from "firebase/firestore";
import { db, auth } from "../firebaseClient";

/**
 * Get current user ID, or "anon" if not authenticated
 */
function uid(): string {
  return auth.currentUser?.uid ?? "anon";
}

/**
 * Remove undefined values from an object recursively (Firestore doesn't accept undefined)
 * Also handles arrays and nested objects
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => removeUndefined(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  
  // Primitives
  return obj;
}

/**
 * Create a new document at the given path
 * Automatically adds createdAt, updatedAt, updatedBy, and version
 */
export async function createAt(path: string, data: any): Promise<void> {
  const ref = doc(db, path);
  await setDoc(ref, removeUndefined({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid(),
    version: 1,
  }));
}

/**
 * Set/merge document at the given path
 * Automatically updates updatedAt, updatedBy, and increments version
 */
export async function setAt(path: string, data: any): Promise<void> {
  const ref = doc(db, path);
  await setDoc(
    ref,
    removeUndefined({
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: uid(),
      version: increment(1),
    }),
    { merge: true }
  );
}

/**
 * Update specific fields in a document
 * Automatically updates updatedAt, updatedBy, and increments version
 */
export async function updateAt(path: string, partial: any): Promise<void> {
  const ref = doc(db, path);
  await updateDoc(ref, removeUndefined({
    ...partial,
    updatedAt: serverTimestamp(),
    updatedBy: uid(),
    version: increment(1),
  }));
}

/**
 * Delete a document at the given path
 */
export async function deleteAt(path: string): Promise<void> {
  const ref = doc(db, path);
  await deleteDoc(ref);
}
