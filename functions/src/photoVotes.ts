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

function choosePairForRanking(photos: BattlePhoto[]): [BattlePhoto, BattlePhoto] {
  if (photos.length < 2) {
    throw new functions.https.HttpsError('failed-precondition', 'Need at least two photos for a battle.');
  }

  // Always work with copies so the original array is not mutated.
  const ranked = [...photos].map(photo => ({
    ...photo,
    rating: typeof photo.rating === 'number' ? photo.rating : 1200,
    totalVotes: typeof photo.totalVotes === 'number' ? photo.totalVotes : 0,
  }));

  // Sort by how many votes they have (lowest first) so under-sampled photos get surfaced,
  // then by rating to keep pairs relatively close and informative for Elo.
  ranked.sort((a, b) => {
    if (a.totalVotes !== b.totalVotes) return a.totalVotes - b.totalVotes;
    return Math.abs(a.rating - 1200) - Math.abs(b.rating - 1200);
  });

  const anchor = ranked[0];
  const candidates = ranked.slice(1);
  if (candidates.length === 1) {
    const pair: [BattlePhoto, BattlePhoto] = Math.random() > 0.5 ? [anchor, candidates[0]] : [candidates[0], anchor];
    return pair;
  }

  // Consider the next few lowest-voted photos and pick the one closest in rating to the anchor
  // to quickly converge on a stable ordering.
  const searchPool = candidates.slice(0, Math.min(5, candidates.length));
  searchPool.sort((a, b) => {
    const diffA = Math.abs(a.rating - anchor.rating);
    const diffB = Math.abs(b.rating - anchor.rating);
    if (diffA !== diffB) return diffA - diffB;
    return a.totalVotes - b.totalVotes;
  });

  const chosen = searchPool[0];
  const pair: [BattlePhoto, BattlePhoto] = Math.random() > 0.5 ? [anchor, chosen] : [chosen, anchor];
  return pair;
}

export const getNextPhotoPair = functions.https.onCall(async request => {
  const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId : '';
  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId is required.');
  }

  const sessionRef = db.collection('photoBattles').doc(sessionId);
  const snap = await sessionRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Session not found');
  }

  const session = snap.data() as PhotoBattle;
  const photos = session.photos ?? [];
  if (photos.length < 2) {
    throw new functions.https.HttpsError('failed-precondition', 'Need at least two photos for a battle.');
  }

  const [left, right] = choosePairForRanking(photos);
  return { left, right };
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
