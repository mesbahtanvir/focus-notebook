/**
 * Create Plaid Link Token
 *
 * Generates a link_token for initializing Plaid Link UI
 * This token is used to authenticate the user and configure the Link flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPlaidClient, isPlaidConfigured } from '@/lib/plaidClient';
import { CountryCode, Products } from 'plaid';

export async function POST(request: NextRequest) {
  try {
    // Check if Plaid is configured
    if (!isPlaidConfigured()) {
      return NextResponse.json(
        {
          error: 'Plaid is not configured',
          needsSetup: true,
          message: 'Please add your Plaid API credentials to .env.local',
        },
        { status: 200 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const plaidClient = createPlaidClient();

    // Create link token
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'Focus Notebook',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.Ca],
      language: 'en',
      webhook: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`
        : undefined,
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
      request_id: response.data.request_id,
    });
  } catch (error: any) {
    console.error('Plaid link token creation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create link token',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
