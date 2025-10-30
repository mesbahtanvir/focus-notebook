'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestments } from '@/store/useInvestments';
import { InvestmentFormModal } from '@/components/investment/InvestmentFormModal';
import { ContributionFormModal } from '@/components/investment/ContributionFormModal';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toolThemes } from '@/components/tools/themes';
import { Edit, Trash2, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    subscribe,
    getPortfolio,
    getTotalPortfolioValue,
    getTotalInvested,
    getPortfolioROI,
    deleteInvestment,
    deleteContribution,
  } = useInvestments();

  const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const portfolio = getPortfolio(params.id);

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Portfolio not found</h2>
          <Button onClick={() => router.push('/tools/investments')}>
            Back to Portfolios
          </Button>
        </div>
      </div>
    );
  }

  const totalValue = getTotalPortfolioValue(portfolio.id);
  const totalInvested = getTotalInvested(portfolio.id);
  const roi = getPortfolioROI(portfolio.id);
  const gain = totalValue - totalInvested;
  const isPositive = gain >= 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    if (confirm('Are you sure you want to delete this investment?')) {
      try {
        await deleteInvestment(portfolio.id, investmentId);
        toast({ title: 'Success', description: 'Investment deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete investment', variant: 'destructive' });
      }
    }
  };

  const handleDeleteContribution = async (investmentId: string, contributionId: string) => {
    if (confirm('Are you sure you want to delete this contribution?')) {
      try {
        await deleteContribution(portfolio.id, investmentId, contributionId);
        toast({ title: 'Success', description: 'Contribution deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete contribution', variant: 'destructive' });
      }
    }
  };

  const theme = toolThemes.gold;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ToolHeader
          title={portfolio.name}
          emoji="💰"
          showBackButton
          stats={[
            {
              label: 'Current Value',
              value: formatCurrency(totalValue),
              variant: 'default',
            },
            {
              label: 'ROI',
              value: `${roi.toFixed(2)}%`,
              variant: isPositive ? 'success' : 'warning',
            },
          ]}
          theme={theme}
        />

        {portfolio.description && (
          <Card className="p-4">
            <p className="text-gray-700 dark:text-gray-300">{portfolio.description}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Invested</h3>
            <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Value</h3>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalValue)}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Gain/Loss</h3>
            <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(gain)}
            </p>
            <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {roi.toFixed(2)}%
            </p>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Investments</h2>
          {portfolio.investments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No investments in this portfolio yet
              </p>
              <Button onClick={() => setIsInvestmentFormOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                Add First Investment
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {portfolio.investments.map((investment) => {
                const investmentGain = investment.currentValue - investment.initialAmount;
                const investmentROI =
                  investment.initialAmount > 0
                    ? ((investmentGain / investment.initialAmount) * 100)
                    : 0;
                const isInvestmentPositive = investmentGain >= 0;

                return (
                  <Card key={investment.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{investment.name}</h3>
                        <Badge className="mt-2">{investment.type}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvestment(investment.id);
                            setIsContributionFormOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvestment(investment.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Initial</p>
                        <p className="font-semibold">{formatCurrency(investment.initialAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
                        <p className="font-semibold text-amber-600">
                          {formatCurrency(investment.currentValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Gain/Loss</p>
                        <p className={`font-semibold ${isInvestmentPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(investmentGain)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">ROI</p>
                        <p className={`font-semibold ${isInvestmentPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {investmentROI.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {investment.contributions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold mb-3">Contribution History</h4>
                        <div className="space-y-2">
                          {investment.contributions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5)
                            .map((contribution) => (
                              <div
                                key={contribution.id}
                                className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                              >
                                <div className="flex items-center gap-3">
                                  <Badge
                                    className={
                                      contribution.type === 'deposit'
                                        ? 'bg-green-500/10 text-green-700'
                                        : contribution.type === 'withdrawal'
                                        ? 'bg-red-500/10 text-red-700'
                                        : 'bg-blue-500/10 text-blue-700'
                                    }
                                  >
                                    {contribution.type}
                                  </Badge>
                                  <span>{formatDate(contribution.date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatCurrency(contribution.amount)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteContribution(investment.id, contribution.id)}
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {investment.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{investment.notes}</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <FloatingActionButton onClick={() => setIsInvestmentFormOpen(true)} title="Add" />

        <InvestmentFormModal
          isOpen={isInvestmentFormOpen}
          onClose={() => setIsInvestmentFormOpen(false)}
          portfolioId={portfolio.id}
        />

        {selectedInvestment && (
          <ContributionFormModal
            isOpen={isContributionFormOpen}
            onClose={() => {
              setIsContributionFormOpen(false);
              setSelectedInvestment(null);
            }}
            portfolioId={portfolio.id}
            investmentId={selectedInvestment}
          />
        )}
      </div>
    </div>
  );
}
