'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { X, TrendingUp, Loader2 } from 'lucide-react';
import { Investment, InvestmentType, AssetType, useInvestments } from '@/store/useInvestments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fetchStockPrice, validateTicker } from '@/lib/services/stockApi';
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency as formatCurrencyValue } from '@/lib/services/currency';

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
}

const DEFAULT_CURRENCY = 'CAD';
const STOCK_QUOTE_CURRENCY = 'USD';

export function InvestmentFormModal({
  isOpen,
  onClose,
  portfolioId,
  investment,
}: InvestmentFormModalProps) {
  const { addInvestment, updateInvestment } = useInvestments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [currentStockPrice, setCurrentStockPrice] = useState<number | null>(null);
  const [tickerError, setTickerError] = useState<string>('');
  const { toast } = useToast();

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
          <div>
            <Label htmlFor="assetType">Asset Type *</Label>
            <Controller
              name="assetType"
              control={control}
              rules={{ required: 'Asset type is required' }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={value => field.onChange(value as AssetType)}
                >
                  <SelectTrigger id="assetType">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock Ticker (Auto-Track)</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
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
                <Select
                  value={field.value}
                  onValueChange={value => field.onChange(value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(code => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
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
                  value={field.value}
                  onValueChange={value => field.onChange(value as InvestmentType)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="bonds">Bonds</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="retirement">Retirement Account</SelectItem>
                    <SelectItem value="mutual-funds">Mutual Funds</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="initialAmount">Initial Amount Invested *</Label>
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
