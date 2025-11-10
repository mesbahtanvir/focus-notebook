import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Anthropic } from '@anthropic-ai/sdk';

const db = admin.firestore();

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null;

const MAX_TRANSACTIONS_GLOBAL = parseInt(process.env.TRIP_LINK_BATCH_LIMIT || '60', 10);
const MAX_TRANSACTIONS_PER_USER = parseInt(process.env.TRIP_LINK_BATCH_PER_USER || '12', 10);
const MODEL_NAME = process.env.TRIP_LINK_MODEL || 'claude-3-5-sonnet-20241022';

interface TransactionCandidate {
  id: string;
  amount: number;
  isoCurrency: string;
  merchant: string;
  description: string;
  postedAt: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  } | null;
}

interface TripCandidate {
  id: string;
  name: string;
  destination?: string;
  startDate: string;
  endDate: string;
  currency: string;
}

interface TripLinkDecision {
  transactionId: string;
  decision: 'link' | 'suggest' | 'skip';
  tripId: string | null;
  confidence: number;
  reasoning?: string;
}

export const processTransactionTripLinks = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    if (!anthropic) {
      console.warn('Skipping trip link processing because ANTHROPIC_API_KEY is not configured.');
      return;
    }

    const snapshot = await db
      .collection('transactions')
      .where('tripLinkStatus', '==', 'pending')
      .where('pending', '==', false)
      .orderBy('postedAt', 'desc')
      .limit(MAX_TRANSACTIONS_GLOBAL)
      .get();

    if (snapshot.empty) {
      console.log('No transactions awaiting trip linking.');
      return;
    }

    const bucketMap: Record<string, FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const uid = data.uid;
      if (!uid) {
        return;
      }
      if (!bucketMap[uid]) {
        bucketMap[uid] = [];
      }
      if (bucketMap[uid].length < MAX_TRANSACTIONS_PER_USER) {
        bucketMap[uid].push(doc);
      }
    });

    const processingBatch = db.batch();
    Object.values(bucketMap).forEach((docs) => {
      docs.forEach((doc) => {
        processingBatch.update(doc.ref, {
          tripLinkStatus: 'processing',
          tripLinkUpdatedAt: Date.now(),
          tripLinkError: admin.firestore.FieldValue.delete(),
        });
      });
    });
    await processingBatch.commit();

    for (const [uid, docs] of Object.entries(bucketMap)) {
      try {
        await processUserTransactions(uid, docs);
      } catch (error: any) {
        console.error(`Failed to process trip links for uid ${uid}:`, error);
        const batch = db.batch();
        docs.forEach((doc) => {
          batch.update(doc.ref, {
            tripLinkStatus: 'pending',
            tripLinkError: error?.message || 'Trip linking failed',
          });
        });
        await batch.commit();
      }
    }
  });

async function processUserTransactions(
  uid: string,
  docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
) {
  if (!anthropic) return;

  const tripsSnapshot = await db.collection(`users/${uid}/trips`).orderBy('createdAt', 'desc').limit(25).get();
  const trips: TripCandidate[] = tripsSnapshot.docs
    .map((tripDoc) => {
      const data = tripDoc.data();
      return {
        id: tripDoc.id,
        name: data.name,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        currency: data.currency || 'USD',
      } as TripCandidate;
    })
    .filter((trip) => Boolean(trip.startDate && trip.endDate));

  if (trips.length === 0) {
    console.log(`No trips found for uid ${uid}; marking ${docs.length} transactions as skipped.`);
    const batch = db.batch();
    docs.forEach((doc) => {
      batch.update(doc.ref, {
        tripLinkStatus: 'skipped',
        tripLinkUpdatedAt: Date.now(),
        tripLink: admin.firestore.FieldValue.delete(),
        tripLinkSuggestion: admin.firestore.FieldValue.delete(),
        tripLinkError: 'No trips available for matching',
      });
    });
    await batch.commit();
    return;
  }

  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

  const transactions: TransactionCandidate[] = docs.map((txn) => {
    const data = txn.data();
    return {
      id: txn.id,
      amount: Math.abs(data.amount),
      isoCurrency: data.isoCurrency,
      merchant: data.merchant?.normalized || data.merchant?.name || data.originalDescription,
      description: data.originalDescription,
      postedAt: data.postedAt,
      location: data.location
        ? {
            city: data.location.city,
            region: data.location.region,
            country: data.location.country,
          }
        : null,
    };
  });

  const decisions = await inferTripLinks(trips, transactions);
  const decisionMap = new Map(decisions.map((d) => [d.transactionId, d]));

  const batch = db.batch();
  const now = Date.now();

  docs.forEach((transactionDoc) => {
    const decision = decisionMap.get(transactionDoc.id);
    const txnRef = transactionDoc.ref;
    const tripLinkBase = {
      tripLinkUpdatedAt: now,
      tripLinkError: admin.firestore.FieldValue.delete(),
    } as any;

    if (!decision || decision.decision === 'skip' || !decision.tripId) {
      batch.update(txnRef, {
        ...tripLinkBase,
        tripLinkStatus: 'skipped',
        tripLink: admin.firestore.FieldValue.delete(),
        tripLinkSuggestion: admin.firestore.FieldValue.delete(),
      });
      return;
    }

    const trip = tripMap.get(decision.tripId);
    if (!trip) {
      batch.update(txnRef, {
        ...tripLinkBase,
        tripLinkStatus: 'skipped',
        tripLink: admin.firestore.FieldValue.delete(),
        tripLinkSuggestion: admin.firestore.FieldValue.delete(),
        tripLinkError: `Trip ${decision.tripId} not found`,
      });
      return;
    }

    const normalizedConfidence = Math.max(0, Math.min(1, decision.confidence));
    const finalDecision =
      decision.decision === 'link' && normalizedConfidence >= 0.8
        ? 'link'
        : decision.decision === 'suggest' || normalizedConfidence >= 0.6
        ? 'suggest'
        : 'skip';

    if (finalDecision === 'link') {
      batch.update(txnRef, {
        ...tripLinkBase,
        tripLinkStatus: 'linked',
        tripLink: {
          tripId: trip.id,
          tripName: trip.name,
          tripDestination: trip.destination,
          confidence: normalizedConfidence,
          method: 'ai-auto',
          reasoning: decision.reasoning,
          linkedAt: now,
        },
        tripLinkSuggestion: admin.firestore.FieldValue.delete(),
      });
    } else if (finalDecision === 'suggest') {
      batch.update(txnRef, {
        ...tripLinkBase,
        tripLinkStatus: 'suggested',
        tripLink: admin.firestore.FieldValue.delete(),
        tripLinkSuggestion: {
          tripId: trip.id,
          tripName: trip.name,
          tripDestination: trip.destination,
          confidence: normalizedConfidence,
          reasoning: decision.reasoning,
          suggestedAt: now,
          status: 'pending',
        },
      });
    } else {
      batch.update(txnRef, {
        ...tripLinkBase,
        tripLinkStatus: 'skipped',
        tripLink: admin.firestore.FieldValue.delete(),
        tripLinkSuggestion: admin.firestore.FieldValue.delete(),
      });
    }
  });

  await batch.commit();
}

async function inferTripLinks(trips: TripCandidate[], transactions: TransactionCandidate[]) {
  if (!anthropic) return [] as TripLinkDecision[];
  if (transactions.length === 0 || trips.length === 0) {
    return [];
  }

const systemPrompt = `You match bank transactions to user trips. Only link a transaction to a trip when currency, timing, and merchant/location strongly indicate they belong together.
Return structured JSON and never invent trips.`;

  const tripBlock = trips
    .map((trip) =>
      `- [${trip.id}] ${trip.name} (${trip.destination || 'Unknown Destination'}) from ${trip.startDate} to ${trip.endDate} in ${trip.currency}`
    )
    .join('\n');

  const transactionBlock = transactions
    .map((txn) => {
      const location = txn.location
        ? ` | location: ${[txn.location.city, txn.location.region, txn.location.country]
            .filter(Boolean)
            .join(', ')}`
        : '';
      return `- [${txn.id}] ${txn.postedAt} • ${txn.isoCurrency} ${txn.amount.toFixed(2)} @ ${txn.merchant}${location} | ${txn.description}`;
    })
    .join('\n');

  const userPrompt = `Trips:\n${tripBlock || 'None'}\n\nTransactions:\n${transactionBlock || 'None'}\n\nFor each transaction respond with JSON matching:
{
  "results": [
    {
      "transactionId": "",
      "decision": "link" | "suggest" | "skip",
      "tripId": "trip-id-or-null",
      "confidence": 0.0-1.0,
      "reasoning": "string"
    }
  ]
}
Rules:
- Use "link" only when confidence >= 0.8.
- Use "suggest" for confidence between 0.6 and 0.79.
- Otherwise "skip" with null tripId.
- Confidence must be numeric 0-1.
- Each transaction appears exactly once.`;

  const message = await anthropic.messages.create({
    model: MODEL_NAME,
    max_tokens: 1500,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const text = extractTextContent(message);
  if (!text) {
    return [];
  }

  const jsonPayload = extractJsonBlock(text);
  if (!jsonPayload) {
    return [];
  }

  const parsed = JSON.parse(jsonPayload);
  const results: TripLinkDecision[] = Array.isArray(parsed.results)
    ? parsed.results
        .filter((entry: any) => entry?.transactionId)
        .map((entry: any) => ({
          transactionId: String(entry.transactionId),
          decision: entry.decision === 'link' || entry.decision === 'suggest' ? entry.decision : 'skip',
          tripId: entry.tripId ? String(entry.tripId) : null,
          confidence: typeof entry.confidence === 'number' ? entry.confidence : 0,
          reasoning: entry.reasoning ? String(entry.reasoning) : undefined,
        }))
    : [];

  return results;
}

function extractTextContent(message: any): string {
  if (!message?.content || !Array.isArray(message.content)) {
    return '';
  }

  return message.content
    .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part: any) => String(part.text))
    .join('\n');
}

function extractJsonBlock(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const codeFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFence && codeFence[1]) {
    return codeFence[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

export const linkTransactionToTrip = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const transactionId = data?.transactionId;
  const tripId = data?.tripId;
  if (!transactionId || !tripId) {
    throw new functions.https.HttpsError('invalid-argument', 'transactionId and tripId are required.');
  }

  const txnRef = db.collection('transactions').doc(transactionId);
  const txnSnap = await txnRef.get();
  if (!txnSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Transaction not found.');
  }
  if (txnSnap.data()?.uid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot modify this transaction.');
  }

  const tripRef = db.collection(`users/${uid}/trips`).doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Trip not found.');
  }
  const trip = tripSnap.data() || {};

  await txnRef.update({
    tripLinkStatus: 'linked',
    tripLinkUpdatedAt: Date.now(),
    tripLinkError: admin.firestore.FieldValue.delete(),
    tripLink: {
      tripId,
      tripName: trip.name || 'Trip',
      tripDestination: trip.destination,
      confidence: data?.confidence ?? 1,
      method: 'manual',
      reasoning: data?.reasoning || 'Linked manually by user',
      linkedAt: Date.now(),
    },
    tripLinkSuggestion: admin.firestore.FieldValue.delete(),
  });

  return { success: true };
});

export const dismissTransactionTripSuggestion = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const transactionId = data?.transactionId;
  if (!transactionId) {
    throw new functions.https.HttpsError('invalid-argument', 'transactionId is required.');
  }

  const txnRef = db.collection('transactions').doc(transactionId);
  const txnSnap = await txnRef.get();
  if (!txnSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Transaction not found.');
  }
  if (txnSnap.data()?.uid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot modify this transaction.');
  }

  await txnRef.update({
    tripLinkStatus: 'skipped',
    tripLinkSuggestion: admin.firestore.FieldValue.delete(),
    tripLinkUpdatedAt: Date.now(),
  });

  return { success: true };
});
