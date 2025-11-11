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
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    );
  }
  const idToken = authHeader.replace('Bearer', '').trim();
  const appCheckToken = req.headers.get('x-firebase-appcheck');
  const instanceIdToken = req.headers.get('firebase-instance-id-token');

  try {
    const payload = await parseRequestBody(req);
    const result = await callFirebaseCallable(
      functionName,
      payload,
      idToken,
      appCheckToken,
      instanceIdToken
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleCallableError(error);
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
