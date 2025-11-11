import { NextResponse } from 'next/server';

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const region = process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1';
const baseUrl =
  process.env.CLOUD_FUNCTIONS_BASE_URL ||
  (projectId ? `https://${region}-${projectId}.cloudfunctions.net` : null);

export class FirebaseCallableError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function callFirebaseCallable<TData extends object = any>(
  functionName: string,
  data: TData,
  idToken: string,
  appCheckToken?: string | null,
  instanceIdToken?: string | null
) {
  if (!baseUrl) {
    throw new FirebaseCallableError(
      'Firebase project ID is not configured on the server.',
      500
    );
  }

  const url = `${baseUrl}/${functionName}`;
  console.log('[callFirebaseCallable] Calling:', {
    functionName,
    url,
    hasToken: Boolean(idToken),
    tokenLength: idToken?.length,
    tokenPrefix: idToken?.substring(0, 20),
    hasAppCheck: Boolean(appCheckToken),
    hasInstanceId: Boolean(instanceIdToken),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
      ...(instanceIdToken
        ? { 'Firebase-Instance-ID-Token': instanceIdToken }
        : {}),
    },
    body: JSON.stringify({ data }),
  });

  console.log('[callFirebaseCallable] Response:', {
    functionName,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    console.error('[callFirebaseCallable] Failed to parse response:', {
      functionName,
      textLength: text?.length,
      textPrefix: text?.substring(0, 200),
    });
    payload = { error: { message: text || 'Malformed response' } };
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error?.status ||
      `Callable function ${functionName} failed with status ${response.status}`;
    console.error('[callFirebaseCallable] Function call failed:', {
      functionName,
      status: response.status,
      message,
      payload,
    });
    throw new FirebaseCallableError(message, response.status);
  }

  console.log('[callFirebaseCallable] Function call succeeded:', functionName);
  return payload?.result ?? payload?.data ?? payload;
}

export function handleCallableError(error: unknown) {
  if (error instanceof FirebaseCallableError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Callable proxy error:', error);
  return NextResponse.json(
    { error: 'Unexpected server error' },
    { status: 500 }
  );
}
