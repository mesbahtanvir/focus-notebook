'use client';

import { FileText, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/services/currency';
import type { CachedInvoice } from '@focus/shared';

interface InvoiceHistoryProps {
  invoices: CachedInvoice[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getStatusBadge(status: CachedInvoice['status']) {
  const variants: Record<CachedInvoice['status'], { variant: 'default' | 'destructive' | 'outline'; label: string }> = {
    'paid': { variant: 'default', label: 'Paid' },
    'open': { variant: 'outline', label: 'Open' },
    'void': { variant: 'destructive', label: 'Void' },
    'uncollectible': { variant: 'destructive', label: 'Uncollectible' },
    'draft': { variant: 'outline', label: 'Draft' },
  };

  const config = variants[status] || { variant: 'outline' as const, label: status };

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}

export function InvoiceHistory({ invoices, isLoading, hasMore, onLoadMore }: InvoiceHistoryProps) {
  if (isLoading && invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No billing history yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Billing History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Description
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm">{formatDate(invoice.created)}</td>
                  <td className="py-3 px-4 text-sm font-medium">
                    {formatCurrency(invoice.amount / 100, invoice.currency.toUpperCase())}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(invoice.status)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {invoice.description || 'Focus Notebook Pro'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {invoice.invoicePdf && (
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      {invoice.hostedInvoiceUrl && (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {formatCurrency(invoice.amount / 100, invoice.currency.toUpperCase())}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(invoice.created)}
                  </div>
                </div>
                {getStatusBadge(invoice.status)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {invoice.description || 'Focus Notebook Pro'}
              </div>
              {(invoice.invoicePdf || invoice.hostedInvoiceUrl) && (
                <div className="flex gap-2 pt-2">
                  {invoice.invoicePdf && (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  )}
                  {invoice.hostedInvoiceUrl && (
                    <a
                      href={invoice.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Invoice
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={onLoadMore}
              className="min-h-[44px]"
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
