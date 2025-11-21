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
 * Also handles arrays and nested objects. Omits undefined fields entirely.
 */
function removeUndefined(obj: any): any {
  // Null is valid in Firestore
  if (obj === null) {
    return null;
  }
  
  // Undefined should be filtered out at parent level
  if (obj === undefined) {
    return undefined; // Will be filtered by parent
  }
  
  // Handle arrays - filter out undefined elements
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => removeUndefined(item));
  }
  
  // Handle plain objects (not Date, not Firebase types, etc.)
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== undefined) {
          const cleanedValue = removeUndefined(value);
          // Only add if the cleaned value is not undefined
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
    }
    return cleaned;
  }
  
  // Return everything else as-is (primitives, Date objects, Firebase FieldValue objects, etc.)
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
