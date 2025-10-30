# Investment Tool - Stock Ticker Setup Guide

## Overview
The investment tool now supports automatic stock price tracking with real-time data fetching, historical charts, and AI-powered predictions.

## Features Implemented
✅ Stock ticker symbol input with real-time price fetching
✅ Automatic price calculation based on quantity
✅ Manual investment tracking (for non-stocks)
✅ Portfolio value charts
✅ Individual stock performance charts
✅ AI-powered investment predictions (using OpenAI)
✅ Daily portfolio snapshots
✅ Price history tracking

## Setup Instructions

### 1. Get Alpha Vantage API Key (Free)

1. Visit [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
2. Sign up for a free API key
3. Free tier includes:
   - 25 API calls per day
   - Real-time stock quotes
   - Historical data (daily)

### 2. Configure Environment Variable

Add the following to your `.env.local` file:

```bash
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

### 3. Restart Development Server

```bash
npm run dev
```

## How to Use

### Adding a Stock Investment

1. Go to Investments tool
2. Create or open a portfolio
3. Click "Add Investment"
4. Select **"Stock Ticker (Auto-Track)"** as Asset Type
5. Enter the stock ticker symbol (e.g., AAPL, TSLA, MSFT)
6. The system will automatically fetch the current price
7. Enter the number of shares you own
8. The current value will be calculated automatically
9. Click "Add"

### Adding a Manual Investment

1. Click "Add Investment"
2. Select **"Manual Entry"** as Asset Type
3. Enter investment details manually
4. You'll update the current value manually over time

### Refreshing Stock Prices

On the portfolio detail page, you'll see:
- Current stock prices for all ticker-based investments
- A "Refresh Prices" button to update all prices
- Individual stock performance charts
- Portfolio value over time chart

### Generating Predictions

1. Open a portfolio detail page
2. Click "Generate Prediction" button
3. The system will use OpenAI to analyze historical data and provide:
   - 30-day price predictions
   - Trend analysis (bullish/bearish/neutral)
   - Risk factors
   - Support and resistance levels

**Note**: Predictions require OpenAI API key (check your app settings)

### Creating Daily Snapshots

To track portfolio value over time:
1. Open portfolio detail page
2. Click "Create Snapshot" button
3. Do this daily to build historical data for the portfolio value chart

## API Rate Limits

### Alpha Vantage (Free Tier)
- **25 API calls per day**
- Prices are cached for 5 minutes
- Historical data cached for 24 hours
- If limit exceeded, you'll see a warning message

**Tips to manage limits**:
- Manual refresh only when needed
- Price cache reduces redundant calls
- Consider upgrading to paid plan for unlimited calls ($50/month)

### OpenAI API
- Uses existing OpenAI integration
- Predictions consume tokens based on GPT-4 model
- Track usage in token usage settings

## Supported Stock Exchanges

Alpha Vantage supports:
- **US Stocks**: NASDAQ, NYSE (e.g., AAPL, TSLA, MSFT)
- **International**: Many global exchanges
- **ETFs**: (e.g., SPY, QQQ, VTI)

Format: Just the ticker symbol (e.g., "AAPL" not "AAPL.US")

## Data Structure

### Investment with Stock Ticker
```typescript
{
  name: "Apple Inc.",
  assetType: "stock",
  ticker: "AAPL",
  quantity: 100,
  currentPricePerShare: 175.43,
  initialAmount: 15000,
  currentValue: 17543,
  priceHistory: [
    { date: "2025-10-29", price: 175.43, source: "api" },
    { date: "2025-10-28", price: 174.21, source: "api" }
  ],
  lastPriceUpdate: "2025-10-29T10:00:00Z"
}
```

### Manual Investment
```typescript
{
  name: "Rental Property",
  assetType: "manual",
  initialAmount: 250000,
  currentValue: 280000,
  // No ticker or price history
}
```

## Troubleshooting

### "Stock API is not configured"
- Check that `ALPHA_VANTAGE_API_KEY` is set in `.env.local`
- Restart your development server after adding the key

### "Invalid ticker symbol"
- Verify the ticker is correct (check on Yahoo Finance or Google)
- Try uppercase (e.g., "AAPL" not "aapl")
- Some international stocks may need special formatting

### "Daily API limit reached"
- Free tier: 25 calls/day
- Wait until tomorrow or upgrade to paid plan
- Use manual value updates in the meantime

### "Failed to fetch stock price"
- Check your internet connection
- Verify API key is valid
- Some tickers may not be available on Alpha Vantage

## Future Enhancements

Potential features to add:
- [ ] Automatic daily price refresh (cron job)
- [ ] Dividend tracking
- [ ] Crypto support (CoinGecko API)
- [ ] Portfolio rebalancing suggestions
- [ ] Tax loss harvesting calculator
- [ ] Real-time WebSocket price updates
- [ ] Stock news integration
- [ ] Comparison with market indices (S&P 500, etc.)

## Alternative APIs

If you prefer different providers:

### Finnhub (60 calls/minute free)
- Real-time data
- More generous limits
- WebSocket support
- [https://finnhub.io](https://finnhub.io)

### Yahoo Finance API (Unofficial)
- No official API
- Can use RapidAPI wrapper
- More data points available

### IEX Cloud
- Good free tier
- Clean API design
- [https://iexcloud.io](https://iexcloud.io)

To switch providers, modify `/src/app/api/stock-price/route.ts` and `/src/app/api/stock-history/route.ts`

## Security Notes

- API keys are stored server-side in environment variables
- Never expose API keys in client-side code
- All API calls go through Next.js API routes
- Rate limiting is implemented server-side
- Price data is cached to reduce API calls

## Support

For issues or questions:
1. Check the console for error messages
2. Verify API key is configured correctly
3. Check API rate limits haven't been exceeded
4. Review Alpha Vantage documentation: [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/)
