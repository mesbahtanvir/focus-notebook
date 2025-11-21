import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface BattlePhoto {
  id: string;
  url: string;
  storagePath: string;
  libraryId?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  rating: number;
  wins: number;
  losses: number;
  totalVotes: number;
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

/**
 * Calculate Rating Deviation (RD) - Glicko-2 inspired confidence metric
 * Higher RD = less confident in rating, needs more comparisons
 * RD decreases as totalVotes increases, asymptotically approaching minimum
 */
function calculateRatingDeviation(totalVotes: number): number {
  const MIN_RD = 30;  // Minimum deviation (very confident)
  const MAX_RD = 350; // Maximum deviation (new photo)
  const DECAY_RATE = 0.15; // How quickly confidence grows

  // RD decays exponentially with votes: RD = MIN + (MAX - MIN) * e^(-decay * votes)
  return MIN_RD + (MAX_RD - MIN_RD) * Math.exp(-DECAY_RATE * totalVotes);
}

/**
 * Calculate expected match outcome using Glicko-2 formula
 * Accounts for both rating difference and rating uncertainty
 */
function expectedScore(ratingA: number, ratingB: number, rdA: number, rdB: number): number {
  const Q = Math.LN10 / 400;
  const g = 1 / Math.sqrt(1 + 3 * Q * Q * (rdA * rdA + rdB * rdB) / (Math.PI * Math.PI));
  return 1 / (1 + Math.pow(10, -g * (ratingA - ratingB) / 400));
}

/**
 * Calculate information gain from a potential matchup
 * Higher variance in outcome = more information gained
 * Prioritizes uncertain matchups and photos with high RD
 */
function informationGain(photoA: BattlePhoto, photoB: BattlePhoto): number {
  const rdA = calculateRatingDeviation(photoA.totalVotes);
  const rdB = calculateRatingDeviation(photoB.totalVotes);

  // Expected outcome probability
  const expected = expectedScore(photoA.rating, photoB.rating, rdA, rdB);

  // Variance in outcome (entropy): maximum when expected = 0.5
  const outcomeVariance = expected * (1 - expected);

  // Uncertainty factor: average of both RDs (normalized)
  const uncertaintyFactor = (rdA + rdB) / (2 * 350);

  // Combined information gain: balance outcome uncertainty with rating uncertainty
  // Weight outcome variance more heavily (0.7) as it's more important for convergence
  return (0.7 * outcomeVariance) + (0.3 * uncertaintyFactor);
}

/**
 * Swiss-system inspired pairing with Glicko-2 confidence tracking
 * Balances exploration (new/uncertain photos) with exploitation (refining rankings)
 */
function choosePairForRanking(photos: BattlePhoto[]): [BattlePhoto, BattlePhoto] {
  if (photos.length < 2) {
    throw new functions.https.HttpsError('failed-precondition', 'Need at least two photos for a battle.');
  }

  // Normalize photos with defaults
  const normalized = photos.map(photo => ({
    ...photo,
    rating: typeof photo.rating === 'number' ? photo.rating : 1200,
    totalVotes: typeof photo.totalVotes === 'number' ? photo.totalVotes : 0,
  }));

  // Calculate rating deviation for each photo
  const enriched = normalized.map(photo => ({
    ...photo,
    rd: calculateRatingDeviation(photo.totalVotes),
  }));

  // Phase 1: Exploration - if any photos have < 5 votes, prioritize them
  const newPhotos = enriched.filter(p => p.totalVotes < 5);

  if (newPhotos.length >= 2) {
    // Bootstrap phase: pair new photos with each other for quick initial ratings
    const shuffled = [...newPhotos].sort(() => Math.random() - 0.5);
    const pair: [BattlePhoto, BattlePhoto] = Math.random() > 0.5
      ? [shuffled[0], shuffled[1]]
      : [shuffled[1], shuffled[0]];
    return pair;
  }

  if (newPhotos.length === 1) {
    // Pair the new photo with an established photo of medium rating
    const newPhoto = newPhotos[0];
    const established = enriched.filter(p => p.id !== newPhoto.id && p.totalVotes >= 5);

    if (established.length > 0) {
      // Sort by closeness to median rating
      const medianRating = 1200;
      established.sort((a, b) =>
        Math.abs(a.rating - medianRating) - Math.abs(b.rating - medianRating)
      );

      // Pick from top 3 closest to median (adds variety)
      const pool = established.slice(0, Math.min(3, established.length));
      const opponent = pool[Math.floor(Math.random() * pool.length)];

      const pair: [BattlePhoto, BattlePhoto] = Math.random() > 0.5
        ? [newPhoto, opponent]
        : [opponent, newPhoto];
      return pair;
    }
  }

  // Phase 2: Exploitation - all photos established, maximize information gain
  // Use Swiss-system approach: pair photos with similar ratings but consider uncertainty

  // Sort by a composite "priority score" that balances:
  // 1. Rating deviation (uncertainty) - higher RD = higher priority
  // 2. Total votes (inverse) - fewer votes = higher priority
  const withPriority = enriched.map(photo => ({
    ...photo,
    priority: photo.rd / 350 + (1 / (1 + photo.totalVotes * 0.1)),
  }));

  withPriority.sort((a, b) => b.priority - a.priority);

  // Select anchor from top 30% of priority (or at least top 2)
  const anchorPoolSize = Math.max(2, Math.ceil(withPriority.length * 0.3));
  const anchorPool = withPriority.slice(0, anchorPoolSize);
  const anchor = anchorPool[Math.floor(Math.random() * anchorPool.length)];

  // Find best opponents by calculating information gain
  const candidates = withPriority
    .filter(p => p.id !== anchor.id)
    .map(opponent => ({
      photo: opponent,
      gain: informationGain(anchor, opponent),
      ratingDiff: Math.abs(anchor.rating - opponent.rating),
    }));

  if (candidates.length === 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Need at least two photos for a battle.');
  }

  // Sort by information gain (descending), with rating difference as tiebreaker
  candidates.sort((a, b) => {
    const gainDiff = b.gain - a.gain;
    if (Math.abs(gainDiff) > 0.01) return gainDiff;
    return a.ratingDiff - b.ratingDiff; // Prefer closer ratings as tiebreaker
  });

  // Select opponent from top candidates with weighted random sampling
  // Top 20% of candidates, or at least top 3
  const opponentPoolSize = Math.max(3, Math.ceil(candidates.length * 0.2));
  const opponentPool = candidates.slice(0, opponentPoolSize);

  // Weighted random selection: higher information gain = higher probability
  const totalWeight = opponentPool.reduce((sum, c) => sum + c.gain, 0);
  let random = Math.random() * totalWeight;

  let chosen = opponentPool[0];
  for (const candidate of opponentPool) {
    random -= candidate.gain;
    if (random <= 0) {
      chosen = candidate;
      break;
    }
  }

  // Randomize order (left/right position)
  const pair: [BattlePhoto, BattlePhoto] = Math.random() > 0.5
    ? [anchor, chosen.photo]
    : [chosen.photo, anchor];

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

  // Enrich the photos with library data if needed
  const enrichedLeft = await enrichPhotoData(left, session.ownerId);
  const enrichedRight = await enrichPhotoData(right, session.ownerId);

  return { left: enrichedLeft, right: enrichedRight };
});

async function enrichPhotoData(photo: BattlePhoto, ownerId: string): Promise<BattlePhoto> {
  // If photo already has url and storagePath, return as is
  if (photo.url && photo.storagePath) {
    return photo;
  }

  // Otherwise, fetch from library
  if (!photo.libraryId) {
    return photo;
  }

  const libraryRef = db.collection('users').doc(ownerId).collection('photoLibrary').doc(photo.libraryId);
  const librarySnap = await libraryRef.get();

  if (!librarySnap.exists) {
    return photo;
  }

  const libraryData = librarySnap.data() as any;

  return {
    ...photo,
    url: libraryData.url || photo.url || '',
    storagePath: libraryData.storagePath || photo.storagePath || '',
    thumbnailUrl: libraryData.thumbnailUrl || photo.thumbnailUrl,
    thumbnailPath: libraryData.thumbnailPath || photo.thumbnailPath,
  };
}

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
