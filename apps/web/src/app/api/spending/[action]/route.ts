import { NextRequest, NextResponse } from 'next/server';
import {
  callFirebaseCallable,
  handleCallableError,
} from '../_lib/callFirebaseFunction';

const FUNCTION_MAP: Record<string, string> = {
  'link-token': 'createLinkToken',
  'relink-token': 'createRelinkToken',
  'exchange-public-token': 'exchangePublicToken',
  'mark-relinking': 'markRelinking',
  'trigger-sync': 'triggerSync',
  'process-csv': 'processCSVTransactions',
  'link-transaction-trip': 'linkTransactionToTrip',
  'dismiss-trip-suggestion': 'dismissTransactionTripSuggestion',
  'delete-all-transactions': 'deleteAllTransactions',
};

async function parseRequestBody(req: NextRequest) {
  if (req.headers.get('content-length') === '0') {
    return {};
  }

  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { action: string } }
) {
  const functionName = FUNCTION_MAP[params.action];
  if (!functionName) {
    console.error('[Spending API] Unknown action:', params.action);
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  console.log('[Spending API] Request:', {
    action: params.action,
    function: functionName,
    hasAuth: Boolean(req.headers.get('authorization')),
    hasAppCheck: Boolean(req.headers.get('x-firebase-appcheck')),
    hasInstanceId: Boolean(req.headers.get('firebase-instance-id-token')),
  });

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[Spending API] Missing or invalid Authorization header:', {
      hasHeader: Boolean(authHeader),
      startsWithBearer: authHeader?.startsWith('Bearer '),
      headerPrefix: authHeader?.substring(0, 10),
    });
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    );
  }
  const idToken = authHeader.slice(7).trim(); // Remove "Bearer " prefix (7 chars)

  if (!idToken || idToken.length < 20) {
    console.error('[Spending API] Invalid token format:', {
      hasToken: Boolean(idToken),
      tokenLength: idToken?.length,
    });
    return NextResponse.json(
      { error: 'Invalid Authorization token format' },
      { status: 401 }
    );
  }

  console.log('[Spending API] Token extracted successfully:', {
    tokenLength: idToken.length,
    tokenPrefix: idToken.substring(0, 20),
  });

  const appCheckToken = req.headers.get('x-firebase-appcheck');
  const instanceIdToken = req.headers.get('firebase-instance-id-token');

  try {
    const payload = await parseRequestBody(req);
    console.log('[Spending API] Calling function:', functionName, 'with payload:', payload);
    const result = await callFirebaseCallable(
      functionName,
      payload,
      idToken,
      appCheckToken,
      instanceIdToken
    );
    console.log('[Spending API] Function call succeeded:', functionName);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Spending API] Function call failed:', {
      function: functionName,
      error: error instanceof Error ? error.message : String(error),
      status: (error as any)?.status,
    });
    return handleCallableError(error);
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
