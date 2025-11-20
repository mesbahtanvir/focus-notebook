import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface BattlePhoto {
  id: string;
  rating: number;
  wins: number;
  losses: number;
  totalVotes: number;
  libraryId?: string;
}

interface PhotoBattle {
  ownerId: string;
  photos: BattlePhoto[];
}

const db = admin.firestore();

export const submitPhotoVote = functions.https.onCall(async request => {
  const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId : '';
  const winnerId = typeof request.data?.winnerId === 'string' ? request.data.winnerId : '';
  const loserId = typeof request.data?.loserId === 'string' ? request.data.loserId : '';

  if (!sessionId || !winnerId || !loserId) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId, winnerId, and loserId are required.');
  }

  let sessionOwnerId: string | null = null;
  let winnerLibraryId: string | undefined;
  let loserLibraryId: string | undefined;

  await db.runTransaction(async transaction => {
    const sessionRef = db.collection('photoBattles').doc(sessionId);
    const snap = await transaction.get(sessionRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = snap.data() as PhotoBattle;
    sessionOwnerId = session.ownerId;

    const photos = (session.photos ?? []).map(photo => ({ ...photo }));
    const winner = photos.find(photo => photo.id === winnerId);
    const loser = photos.find(photo => photo.id === loserId);

    if (!winner || !loser) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid photos selected');
    }

    winnerLibraryId = winner.libraryId;
    loserLibraryId = loser.libraryId;

    const K = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

    winner.rating = Math.max(0, Math.round(winner.rating + K * (1 - expectedWinner)));
    loser.rating = Math.max(0, Math.round(loser.rating + K * (0 - expectedLoser)));
    winner.wins += 1;
    winner.totalVotes += 1;
    loser.losses += 1;
    loser.totalVotes += 1;

    transaction.update(sessionRef, {
      photos,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const historyRef = sessionRef.collection('history').doc();
    transaction.set(historyRef, {
      winnerId,
      loserId,
      voterId: request.auth?.uid ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Update library stats after the transaction using admin privileges
  if (sessionOwnerId) {
    if (winnerLibraryId) {
      await updateLibraryStatsAdmin(sessionOwnerId, winnerLibraryId, 'win', sessionId);
    }
    if (loserLibraryId) {
      await updateLibraryStatsAdmin(sessionOwnerId, loserLibraryId, 'loss', sessionId);
    }
  }

  return null;
});

async function updateLibraryStatsAdmin(ownerId: string, libraryId: string, result: 'win' | 'loss', sessionId: string) {
  const statsRef = db.collection('users').doc(ownerId).collection('photoLibrary').doc(libraryId);
  const snap = await statsRef.get();
  if (!snap.exists) return;

  const data = snap.data() as any;
  const sessionIds: string[] = data?.sessionIds ?? [];
  const alreadyCounted = sessionIds.includes(sessionId);

  const updates: Record<string, admin.firestore.FieldValue> = {
    'stats.totalVotes': admin.firestore.FieldValue.increment(1),
    'stats.lastVotedAt': admin.firestore.FieldValue.serverTimestamp(),
  };
  if (result === 'win') {
    updates['stats.yesVotes'] = admin.firestore.FieldValue.increment(1);
  }
  if (!alreadyCounted) {
    updates['stats.sessionCount'] = admin.firestore.FieldValue.increment(1);
    updates['sessionIds'] = admin.firestore.FieldValue.arrayUnion(sessionId);
  }

  await statsRef.update(updates);
}
