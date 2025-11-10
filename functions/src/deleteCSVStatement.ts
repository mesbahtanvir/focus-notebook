/**
 * Delete CSV Statement Cloud Function
 * Deletes a CSV file and all associated transactions
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

interface DeleteCSVRequest {
  fileName: string;
  storagePath?: string;
}

/**
 * HTTP Callable function to delete CSV statement and all associated transactions
 */
export const deleteCSVStatement = functions.https.onCall(
  async (data: DeleteCSVRequest, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to delete CSV statements'
      );
    }

    const userId = context.auth.uid;
    const { fileName, storagePath } = data;

    if (!fileName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'fileName is required'
      );
    }

    console.log(`Deleting CSV statement for user ${userId}: ${fileName}`);

    try {
      const db = admin.firestore();
      let deletedCount = 0;

      // Query all transactions associated with this CSV file
      const transactionsRef = db.collection(`users/${userId}/transactions`);
      const transactionsQuery = transactionsRef.where('csvFileName', '==', fileName);
      const transactionsSnapshot = await transactionsQuery.get();

      // Delete transactions in batches (Firestore limit is 500 operations per batch)
      const batchSize = 450;
      let batch = db.batch();
      let batchCount = 0;

      for (const doc of transactionsSnapshot.docs) {
        batch.delete(doc.ref);
        batchCount++;
        deletedCount++;

        if (batchCount >= batchSize) {
          await batch.commit();
          batch = db.batch(); // Create new batch for next set of operations
          batchCount = 0;
        }
      }

      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`Deleted ${deletedCount} transactions for ${fileName}`);

      // Delete the CSV file from storage if path is provided
      if (storagePath) {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(storagePath);
          await file.delete();
          console.log(`Deleted storage file: ${storagePath}`);
        } catch (error: any) {
          // File might not exist or already deleted, log but don't fail
          console.warn(`Could not delete storage file ${storagePath}:`, error.message);
        }
      }

      // Delete the processing status document
      try {
        const statusRef = db.collection(`users/${userId}/csvProcessingStatus`).doc(fileName);
        await statusRef.delete();
        console.log(`Deleted processing status for ${fileName}`);
      } catch (error: any) {
        console.warn(`Could not delete processing status for ${fileName}:`, error.message);
      }

      return {
        success: true,
        deletedTransactions: deletedCount,
        fileName,
      };
    } catch (error: any) {
      console.error('Error deleting CSV statement:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to delete CSV statement: ${error.message}`
      );
    }
  }
);
