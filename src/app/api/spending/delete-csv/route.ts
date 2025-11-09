/**
 * Delete CSV Statement API Route
 * Proxies requests to Firebase Cloud Function
 */

import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '../_lib/callFirebaseFunction';

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

    const result = await callFirebaseFunction(
      request,
      'deleteCSVStatement',
      { fileName, storagePath }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in delete-csv route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
