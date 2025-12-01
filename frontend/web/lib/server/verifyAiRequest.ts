import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';

export class UnauthorizedError extends Error {
  statusCode = 401;
}

export class ForbiddenError extends Error {
  statusCode = 403;
}

export interface AiAccessResult {
  uid: string;
  isAnonymous: boolean;
  allowAi: boolean;
}

export async function verifyAiRequest(request: NextRequest): Promise<AiAccessResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing authorization token');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new UnauthorizedError('Missing authorization token');
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error('Failed to verify ID token', error);
    throw new UnauthorizedError('Invalid authentication token');
  }

  const uid = decoded.uid;
  const signInProvider = decoded.firebase?.sign_in_provider;
  const isAnonymous = signInProvider === 'anonymous';

  if (!isAnonymous) {
    return { uid, isAnonymous: false, allowAi: true };
  }

  const sessionRef = adminDb.collection(ANONYMOUS_SESSION_COLLECTION).doc(uid);
  const sessionSnap = await sessionRef.get();
  const sessionData = sessionSnap.data();
  const overrideKey = process.env.ANONYMOUS_AI_OVERRIDE_KEY;

  const expiresAtMillis = sessionData?.expiresAt?.toMillis?.();
  const cleanupPending = sessionData?.cleanupPending === true;
  const allowAi = sessionData?.allowAi === true || (overrideKey && sessionData?.ciOverrideKey === overrideKey);

  if (!sessionSnap.exists || !allowAi || cleanupPending) {
    throw new ForbiddenError('Anonymous sessions cannot access AI features.');
  }

  if (typeof expiresAtMillis === 'number' && expiresAtMillis <= Date.now()) {
    await sessionRef.set(
      {
        status: 'expired',
        cleanupPending: true,
        expiredAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    throw new ForbiddenError('Anonymous session expired.');
  }

  return { uid, isAnonymous: true, allowAi: true };
}
