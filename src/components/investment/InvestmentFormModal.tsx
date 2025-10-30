'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { X, TrendingUp, Loader2 } from 'lucide-react';
import { Investment, InvestmentType, AssetType, useInvestments } from '@/store/useInvestments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fetchStockPrice, validateTicker } from '@/lib/services/stockApi';
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatCurrency as formatCurrencyValue,
} from '@/lib/services/currency';
import { formatCurrency } from '@/lib/currency';
import { CurrencyBadge } from '@/components/investment/CurrencyBadge';

interface InvestmentFormData {
  name: string;
  type: InvestmentType;
  assetType: AssetType;
  ticker?: string;
  quantity?: number;
  initialAmount: number;
  currentValue: number;
  notes?: string;
  currency: string;
}

interface InvestmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  investment?: Investment;
  baseCurrency?: string;
}

const DEFAULT_CURRENCY = 'CAD';
const STOCK_QUOTE_CURRENCY = 'USD';

export function InvestmentFormModal({
  isOpen,
  onClose,
  portfolioId,
  investment,
  baseCurrency,
}: InvestmentFormModalProps) {
  const { addInvestment, updateInvestment } = useInvestments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [currentStockPrice, setCurrentStockPrice] = useState<number | null>(null);
  const [tickerError, setTickerError] = useState<string>('');
  const { toast } = useToast();
  const effectiveBaseCurrency = investment?.baseCurrency || baseCurrency || 'USD';
  const locale = investment?.locale || 'en-US';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<InvestmentFormData>({
    defaultValues: investment
      ? {
          name: investment.name,
          type: investment.type,
          assetType: investment.assetType,
          ticker: investment.ticker || '',
          quantity: investment.quantity || 0,
          initialAmount: investment.initialAmount,
          currentValue: investment.currentValue,
          notes: investment.notes || '',
          currency: investment.currency || DEFAULT_CURRENCY,
        }
      : {
          type: 'stocks',
          assetType: 'manual',
          initialAmount: 0,
          currentValue: 0,
          quantity: 0,
          currency: DEFAULT_CURRENCY,
        },
  });

  const assetType = watch('assetType');
  const investmentType = watch('type');
  const ticker = watch('ticker');
  const quantity = watch('quantity');
  const currency = watch('currency');

  useEffect(() => {
    if (investment) {
      setCurrentStockPrice(investment.currentPricePerShare ?? null);
    } else {
      setCurrentStockPrice(null);
    }
  }, [investment]);

  // Auto-fetch stock price when ticker changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (assetType === 'stock' && ticker && ticker.length >= 1) {
        const upperTicker = ticker.toUpperCase();
        const targetCurrency = currency || DEFAULT_CURRENCY;

        // Validate ticker format
        if (!validateTicker(upperTicker)) {
          setTickerError('Invalid ticker format. Use letters/numbers with optional . or - separators.');
          setCurrentStockPrice(null);
          return;
        }

        setTickerError('');

        // Only fetch if ticker is complete (at least 1 character)
        if (upperTicker.length >= 1) {
          setIsFetchingPrice(true);
          try {
            const quote = await fetchStockPrice(upperTicker);
            const fetchedPrice =
              targetCurrency === STOCK_QUOTE_CURRENCY
                ? quote.price
                : await convertCurrency(quote.price, STOCK_QUOTE_CURRENCY, targetCurrency);
            setCurrentStockPrice(fetchedPrice);
            setTickerError('');

            // Auto-calculate current value if quantity is set
            if (quantity && quantity > 0) {
              setValue('currentValue', fetchedPrice * quantity);
            }
          } catch (error: any) {
            console.error('Error fetching stock price:', error);
            setTickerError(error.message || 'Failed to fetch stock price');
            setCurrentStockPrice(null);
          } finally {
            setIsFetchingPrice(false);
          }
        }
      } else {
        setCurrentStockPrice(null);
        setTickerError('');
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchPrice, 500);
    return () => clearTimeout(timeoutId);
  }, [ticker, assetType, quantity, setValue, currency]);

  // Update current value when quantity changes for stocks
  useEffect(() => {
    if (assetType === 'stock' && currentStockPrice !== null && quantity) {
      setValue('currentValue', currentStockPrice * quantity);
    }
  }, [quantity, currentStockPrice, assetType, setValue]);

  const onSubmit = async (data: InvestmentFormData) => {
    setIsSubmitting(true);
    try {
      const investmentData: any = {
        name: data.name,
        type: data.type,
        assetType: data.assetType,
        initialAmount: Number(data.initialAmount),
        currentValue: Number(data.currentValue),
        notes: data.notes,
        currency: data.currency,
      };

      // Add stock-specific fields
      if (data.assetType === 'stock') {
        if (!data.ticker) {
          toast({ title: 'Error', description: 'Ticker symbol is required for stocks', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        investmentData.ticker = data.ticker.toUpperCase();
        investmentData.quantity = Number(data.quantity) || 0;

        if (currentStockPrice !== null) {
          investmentData.currentPricePerShare = currentStockPrice;
          investmentData.lastPriceUpdate = new Date().toISOString();
          investmentData.priceHistory = [{
            date: new Date().toISOString(),
            price: currentStockPrice,
            source: 'api' as const,
            currency: data.currency,
          }];
        }
      }

      if (investment) {
        await updateInvestment(portfolioId, investment.id, investmentData);
        toast({ title: 'Success', description: 'Investment updated successfully!' });
      } else {
        await addInvestment(portfolioId, investmentData);
        toast({ title: 'Success', description: 'Investment added successfully!' });
      }
      reset();
      setCurrentStockPrice(null);
      onClose();
    } catch (error) {
      console.error('Error saving investment:', error);
      toast({ title: 'Error', description: 'Failed to save investment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">
            {investment ? 'Edit Investment' : 'Add New Investment'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/30">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyBadge code={effectiveBaseCurrency} tone="base" label="Converted" />
              <span className="font-medium text-amber-900 dark:text-amber-100">Converted/base currency</span>
            </div>
            <p className="text-amber-900/80 dark:text-amber-100">
              Enter investment totals using the converted currency used for portfolio calculations.
            </p>
            {investment?.nativeCurrency && (
              <div className="mt-3 rounded border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-100">
                <div className="flex items-center gap-2 mb-1">
                  <CurrencyBadge code={investment.nativeCurrency} tone="native" label="Native" />
                  <span className="font-semibold text-sky-900 dark:text-sky-100">Native snapshot</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {typeof investment.nativeInitialAmount === 'number' && (
                    <div>
                      <p className="uppercase tracking-wide text-[0.6rem] opacity-70">Initial</p>
                      <p className="font-semibold">
                        {formatCurrency(
                          investment.nativeInitialAmount,
                          investment.nativeCurrency,
                          investment.locale || 'en-US'
                        )}
                      </p>
                    </div>
                  )}
                  {typeof investment.nativeCurrentValue === 'number' && (
                    <div>
                      <p className="uppercase tracking-wide text-[0.6rem] opacity-70">Current</p>
                      <p className="font-semibold">
                        {formatCurrency(
                          investment.nativeCurrentValue,
                          investment.nativeCurrency,
                          investment.locale || 'en-US'
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {investment.conversionRate && (
                  <p className="mt-2 text-[0.65rem] text-sky-800/80 dark:text-sky-200">
                    1 {investment.nativeCurrency} ≈ {formatCurrency(investment.conversionRate, effectiveBaseCurrency, locale, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="assetType">Asset Type *</Label>
            <Controller
              name="assetType"
              control={control}
              rules={{ required: 'Asset type is required' }}
              render={({ field }) => (
                <Select
                  id="assetType"
                  value={field.value}
                  onChange={event => field.onChange(event.target.value as AssetType)}
                >
                  <option value="stock">Stock Ticker (Auto-Track)</option>
                  <option value="manual">Manual Entry</option>
                </Select>
              )}
            />
            {errors.assetType && (
              <p className="text-sm text-red-500 mt-1">{errors.assetType.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {assetType === 'stock'
                ? 'Automatically fetch and track stock prices'
                : 'Manually enter and update values'}
            </p>
          </div>

          <div>
            <Label htmlFor="currency">Currency *</Label>
            <Controller
              name="currency"
              control={control}
              rules={{ required: 'Currency is required' }}
              render={({ field }) => (
                <Select id="currency" value={field.value} onChange={event => field.onChange(event.target.value)}>
                  {SUPPORTED_CURRENCIES.map(code => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              )}
            />
            <p className="text-xs text-gray-500 mt-1">
              Amounts will be stored in {currency || DEFAULT_CURRENCY}. Stock quotes fetched in USD are converted
              automatically.
            </p>
            {errors.currency && (
              <p className="text-sm text-red-500 mt-1">{errors.currency.message}</p>
            )}
          </div>

          {assetType === 'stock' && (
            <>
              <div>
                <Label htmlFor="ticker">Stock Ticker Symbol *</Label>
                <div className="relative">
                  <Input
                    id="ticker"
                    {...register('ticker', {
                      required: assetType === 'stock' ? 'Ticker is required' : false
                    })}
                    placeholder="e.g., AAPL, BRK.B, VUN.TO"
                    className="uppercase"
                  />
                  {isFetchingPrice && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {tickerError && (
                  <p className="text-sm text-red-500 mt-1">{tickerError}</p>
                )}
                {currentStockPrice !== null && !tickerError && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      Current price:{' '}
                      <strong>{formatCurrencyValue(currentStockPrice, currency || DEFAULT_CURRENCY)}</strong>
                    </span>
                  </div>
                )}
                {errors.ticker && (
                  <p className="text-sm text-red-500 mt-1">{errors.ticker.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="quantity">Number of Shares *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  {...register('quantity', {
                    required: assetType === 'stock' ? 'Quantity is required' : false,
                    min: { value: 0.001, message: 'Must be greater than 0' },
                  })}
                  placeholder="e.g., 0.009"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="name">Investment Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder={assetType === 'stock' ? 'e.g., Apple Inc.' : 'e.g., Rental Property, Bitcoin'}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Category *</Label>
            <Controller
              name="type"
              control={control}
              rules={{ required: 'Category is required' }}
              render={({ field }) => (
                <Select
                  id="type"
                  value={field.value}
                  onChange={event => field.onChange(event.target.value as InvestmentType)}
                >
                  <option value="stocks">Stocks</option>
                  <option value="bonds">Bonds</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="retirement">Retirement Account</option>
                  <option value="mutual-funds">Mutual Funds</option>
                  <option value="other">Other</option>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="initialAmount">Initial Amount Invested *</Label>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <CurrencyBadge code={effectiveBaseCurrency} tone="base" />
              <span>Converted amount</span>
            </div>
            <Input
              id="initialAmount"
              type="number"
              step="0.01"
              {...register('initialAmount', {
                required: 'Initial amount is required',
                min: { value: 0, message: 'Must be positive' },
              })}
              placeholder="e.g., 10000"
            />
            {errors.initialAmount && (
              <p className="text-sm text-red-500 mt-1">{errors.initialAmount.message}</p>
            )}
          </div>

          {assetType === 'manual' && (
            <div>
              <Label htmlFor="currentValue">Current Value *</Label>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <CurrencyBadge code={effectiveBaseCurrency} tone="base" />
                <span>Converted amount</span>
              </div>
              <Input
                id="currentValue"
                type="number"
                step="0.01"
                {...register('currentValue', {
                  required: 'Current value is required',
                  min: { value: 0, message: 'Must be positive' },
                })}
                placeholder="e.g., 12500"
              />
              {errors.currentValue && (
                <p className="text-sm text-red-500 mt-1">{errors.currentValue.message}</p>
              )}
            </div>
          )}

          {assetType === 'stock' && currentStockPrice !== null && quantity && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Calculated Value:</span>
                <span className="font-semibold text-lg">
                  {formatCurrencyValue(currentStockPrice * (quantity || 0), currency || DEFAULT_CURRENCY)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {quantity} shares × {formatCurrencyValue(currentStockPrice, currency || DEFAULT_CURRENCY)}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this investment"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={isSubmitting || isFetchingPrice}
            >
              {isSubmitting ? 'Saving...' : investment ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
