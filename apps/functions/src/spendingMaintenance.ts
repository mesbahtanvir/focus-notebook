import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { CSV_BATCH_QUEUE_COLLECTION } from './csvStorageTrigger';

async function deleteCollectionDocs(
  collectionRef: FirebaseFirestore.CollectionReference,
  batchSize = 450
): Promise<number> {
  const db = admin.firestore();
  let deleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function deleteQueryDocs(
  query: FirebaseFirestore.Query,
  batchSize = 450
): Promise<number> {
  const db = admin.firestore();
  let deleted = 0;

  while (true) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

export const deleteAllTransactions = functions.https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete transactions'
    );
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    const [transactionsDeleted, statusDeleted, statementsDeleted, queueDeleted] = await Promise.all([
      deleteCollectionDocs(db.collection(`users/${userId}/transactions`)),
      deleteCollectionDocs(db.collection(`users/${userId}/csvProcessingStatus`)),
      deleteCollectionDocs(db.collection(`users/${userId}/statements`)),
      deleteQueryDocs(
        db.collection(CSV_BATCH_QUEUE_COLLECTION).where('userId', '==', userId)
      ),
    ]);

    return {
      success: true,
      summary: {
        transactionsDeleted,
        processingStatusesDeleted: statusDeleted,
        statementsDeleted,
        queuedJobsDeleted: queueDeleted,
      },
    };
  } catch (error: any) {
    console.error('Failed to delete user transactions:', error);
    throw new functions.https.HttpsError(
      'internal',
      error?.message || 'Failed to delete transactions'
    );
  }
});
