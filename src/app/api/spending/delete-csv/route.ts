/**
 * Delete CSV Statement API Route
 * Proxies requests to Firebase Cloud Function
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  callFirebaseCallable,
  handleCallableError,
} from '../_lib/callFirebaseFunction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, storagePath } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName is required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer', '').trim();
    const appCheckToken = request.headers.get('x-firebase-appcheck');
    const instanceIdToken = request.headers.get('firebase-instance-id-token');

    const result = await callFirebaseCallable(
      'deleteCSVStatement',
      { fileName, storagePath },
      idToken,
      appCheckToken,
      instanceIdToken
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleCallableError(error);
  }
}
