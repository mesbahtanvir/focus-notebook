import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';
const ANONYMOUS_SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

type FirestoreWithRecursiveDelete = admin.firestore.Firestore & {
  recursiveDelete?: (ref: admin.firestore.DocumentReference) => Promise<void>;
};
const ANONYMOUS_AI_OVERRIDE_KEY = process.env.ANONYMOUS_AI_OVERRIDE_KEY || '';

export async function cleanupExpiredAnonymousUsersHandler() {
    console.log('Starting cleanup of expired anonymous users');

    let nextPageToken: string | undefined;
    const auth = admin.auth();
    const now = Date.now();
    const cutoff = now - ANONYMOUS_SESSION_DURATION_MS;

    do {
      const result = await auth.listUsers(1000, nextPageToken);

      for (const user of result.users) {
        const isAnonymous = user.providerData.length === 0;
        if (!isAnonymous) {
          continue;
        }

        const uid = user.uid;
        const sessionRef = admin.firestore().collection(ANONYMOUS_SESSION_COLLECTION).doc(uid);
        const sessionSnap = await sessionRef.get();
        const sessionData = sessionSnap.data();

        const overrideKeyMatch = ANONYMOUS_AI_OVERRIDE_KEY && sessionData?.ciOverrideKey === ANONYMOUS_AI_OVERRIDE_KEY;
        if (overrideKeyMatch) {
          console.log(`Skipping CI anonymous user ${uid}`);
          continue;
        }

        const expiresAtMillis = sessionData?.expiresAt?.toMillis?.();
        const cleanupPending = sessionData?.cleanupPending === true;
        const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;

        const expiredBySession = typeof expiresAtMillis === 'number' ? expiresAtMillis <= now : false;
        const expiredByAge = createdAt > 0 ? createdAt <= cutoff : false;

        const shouldDelete = cleanupPending || expiredBySession || expiredByAge;

        if (!shouldDelete) {
          continue;
        }

        console.log(`Cleaning anonymous user ${uid}`);
        await markSessionPendingDeletion(sessionRef);
        await deleteUserData(uid);
        await sessionRef.delete().catch((error) => {
          console.warn(`Failed to delete session document for ${uid}:`, error);
        });

        try {
          await auth.deleteUser(uid);
        } catch (error) {
          console.error(`Failed to delete auth user ${uid}:`, error);
        }
      }

      nextPageToken = result.pageToken;
    } while (nextPageToken);

    console.log('Completed cleanup run for anonymous users');
}

export const cleanupExpiredAnonymousUsers = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(cleanupExpiredAnonymousUsersHandler);

async function markSessionPendingDeletion(sessionRef: admin.firestore.DocumentReference) {
  await sessionRef.set(
    {
      cleanupPending: true,
      status: 'deleting',
      updatedAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );
}

async function deleteUserData(uid: string) {
  const db = admin.firestore() as FirestoreWithRecursiveDelete;
  const userDocRef = db.doc(`users/${uid}`);

  const { recursiveDelete } = db;

  if (typeof recursiveDelete === 'function') {
    try {
      await recursiveDelete(userDocRef);
      return;
    } catch (error) {
      console.warn(`Recursive delete failed for ${uid}, falling back to manual deletion:`, error);
    }
  }

  const subcollections = await userDocRef.listCollections();
  for (const subcollection of subcollections) {
    await deleteCollection(subcollection);
  }

  await userDocRef.delete().catch(() => undefined);
}

async function deleteCollection(collectionRef: admin.firestore.CollectionReference) {
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return;
  }

  let batch = admin.firestore().batch();
  let counter = 0;

  for (const doc of snapshot.docs) {
    await deleteNestedSubcollections(doc.ref);
    batch.delete(doc.ref);
    counter += 1;

    if (counter === 400) {
      await batch.commit();
      batch = admin.firestore().batch();
      counter = 0;
    }
  }

  if (counter > 0) {
    await batch.commit();
  }
}

async function deleteNestedSubcollections(docRef: admin.firestore.DocumentReference) {
  const nestedSubcollections = await docRef.listCollections();

  for (const nested of nestedSubcollections) {
    await deleteCollection(nested);
  }
}

export const __private__ = {
  markSessionPendingDeletion,
  deleteUserData,
  deleteCollection,
  deleteNestedSubcollections,
};
