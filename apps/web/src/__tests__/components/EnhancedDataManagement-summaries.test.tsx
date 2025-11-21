/**
 * Tests for EnhancedDataManagement component with data summaries
 * Validates the new "Detailed Insights" section and visual improvements
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedDataManagement } from '@/components/EnhancedDataManagement';
import { useImportExport } from '@/hooks/useImportExport';

// Mock the useImportExport hook
jest.mock('@/hooks/useImportExport');
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

describe('EnhancedDataManagement - Data Summaries', () => {
  const mockUseImportExport = useImportExport as jest.MockedFunction<typeof useImportExport>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state when no data exists', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 0,
          projects: 0,
          goals: 0,
          thoughts: 0,
          moods: 0,
          focusSessions: 0,
          people: 0,
          portfolios: 0,
          spending: 0,
        }),
        getDataSummaries: () => ({
          tasks: { total: 0, active: 0, completed: 0, highPriority: 0 },
          projects: { total: 0, active: 0, completed: 0, onHold: 0 },
          goals: { total: 0, shortTerm: 0, longTerm: 0, active: 0 },
          thoughts: { total: 0, deepThoughts: 0, withSuggestions: 0 },
          moods: { total: 0, averageMood: '0', thisMonth: 0 },
          focusSessions: { total: 0, totalMinutes: 0, averageRating: '0', thisWeek: 0 },
          people: { total: 0, family: 0, friends: 0, colleagues: 0 },
          portfolios: { total: 0, totalInvestments: 0, active: 0 },
          spending: { total: 0, totalAmount: 0, thisMonth: 0, averageTransaction: '0' },
        }),
        isExporting: false,
      } as any);

      render(<EnhancedDataManagement />);

      expect(screen.getByText(/No data yet/i)).toBeInTheDocument();
      expect(screen.queryByText('Detailed Insights')).not.toBeInTheDocument();
    });
  });

  describe('Data Summaries Display', () => {
    it('should display Overview section with all entity counts', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 5,
          projects: 3,
          goals: 2,
          thoughts: 10,
          moods: 8,
          focusSessions: 4,
          people: 6,
          portfolios: 1,
          spending: 25,
        }),
        getDataSummaries: () => ({
          tasks: { total: 5, active: 3, completed: 2, highPriority: 1 },
          projects: { total: 3, active: 2, completed: 1, onHold: 0 },
          goals: { total: 2, shortTerm: 1, longTerm: 1, active: 2 },
          thoughts: { total: 10, deepThoughts: 3, withSuggestions: 2 },
          moods: { total: 8, averageMood: '7.5', thisMonth: 5 },
          focusSessions: { total: 4, totalMinutes: 100, averageRating: '4.2', thisWeek: 2 },
          people: { total: 6, family: 2, friends: 3, colleagues: 1 },
          portfolios: { total: 1, totalInvestments: 5, active: 1 },
          spending: { total: 25, totalAmount: 1500, thisMonth: 10, averageTransaction: '60.00' },
        }),
        isExporting: false,
      } as any);

      render(<EnhancedDataManagement />);

      // Check Overview section
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getAllByText('5')[0]).toBeInTheDocument(); // Tasks count
      expect(screen.getAllByText('3')[0]).toBeInTheDocument(); // Projects count
      expect(screen.getAllByText('25')[0]).toBeInTheDocument(); // Transactions count
    });

    it('should display Detailed Insights section when data exists', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 5,
          projects: 0,
          goals: 0,
          thoughts: 0,
          moods: 0,
          focusSessions: 0,
          people: 0,
          portfolios: 0,
          spending: 0,
        }),
        getDataSummaries: () => ({
          tasks: { total: 5, active: 3, completed: 2, highPriority: 1 },
          projects: { total: 0, active: 0, completed: 0, onHold: 0 },
          goals: { total: 0, shortTerm: 0, longTerm: 0, active: 0 },
          thoughts: { total: 0, deepThoughts: 0, withSuggestions: 0 },
          moods: { total: 0, averageMood: '0', thisMonth: 0 },
          focusSessions: { total: 0, totalMinutes: 0, averageRating: '0', thisWeek: 0 },
          people: { total: 0, family: 0, friends: 0, colleagues: 0 },
          portfolios: { total: 0, totalInvestments: 0, active: 0 },
          spending: { total: 0, totalAmount: 0, thisMonth: 0, averageTransaction: '0' },
        }),
        isExporting: false,
      } as any);

      render(<EnhancedDataManagement />);

      expect(screen.getByText('Detailed Insights')).toBeInTheDocument();
    });

    it('should display Tasks summary card with correct data', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 10,
          projects: 0,
          goals: 0,
          thoughts: 0,
          moods: 0,
          focusSessions: 0,
          people: 0,
          portfolios: 0,
          spending: 0,
        }),
        getDataSummaries: () => ({
          tasks: { total: 10, active: 7, completed: 3, highPriority: 2 },
          projects: { total: 0, active: 0, completed: 0, onHold: 0 },
          goals: { total: 0, shortTerm: 0, longTerm: 0, active: 0 },
          thoughts: { total: 0, deepThoughts: 0, withSuggestions: 0 },
          moods: { total: 0, averageMood: '0', thisMonth: 0 },
          focusSessions: { total: 0, totalMinutes: 0, averageRating: '0', thisWeek: 0 },
          people: { total: 0, family: 0, friends: 0, colleagues: 0 },
          portfolios: { total: 0, totalInvestments: 0, active: 0 },
          spending: { total: 0, totalAmount: 0, thisMonth: 0, averageTransaction: '0' },
        }),
        isExporting: false,
      } as any);

      render(<EnhancedDataManagement />);

      // Check Tasks summary card
      expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
      expect(screen.getByText('Active:')).toBeInTheDocument();
      expect(screen.getAllByText('7').length).toBeGreaterThan(0);
      expect(screen.getByText('Completed:')).toBeInTheDocument();
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getByText('High Priority:')).toBeInTheDocument();
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });

    it('should display Spending summary card with formatted amounts', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 0,
          projects: 0,
          goals: 0,
          thoughts: 0,
          moods: 0,
          focusSessions: 0,
          people: 0,
          portfolios: 0,
          spending: 50,
        }),
        getDataSummaries: () => ({
          tasks: { total: 0, active: 0, completed: 0, highPriority: 0 },
          projects: { total: 0, active: 0, completed: 0, onHold: 0 },
          goals: { total: 0, shortTerm: 0, longTerm: 0, active: 0 },
          thoughts: { total: 0, deepThoughts: 0, withSuggestions: 0 },
          moods: { total: 0, averageMood: '0', thisMonth: 0 },
          focusSessions: { total: 0, totalMinutes: 0, averageRating: '0', thisWeek: 0 },
          people: { total: 0, family: 0, friends: 0, colleagues: 0 },
          portfolios: { total: 0, totalInvestments: 0, active: 0 },
          spending: { total: 50, totalAmount: 2500.75, thisMonth: 20, averageTransaction: '50.02' },
        }),
        isExporting: false,
      } as any);

      render(<EnhancedDataManagement />);

      // Check Spending summary card
      expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
      expect(screen.getByText('Total Amount:')).toBeInTheDocument();
      expect(screen.getByText('$2500.75')).toBeInTheDocument();
      expect(screen.getByText('This Month:')).toBeInTheDocument();
      expect(screen.getAllByText('20').length).toBeGreaterThan(0);
      expect(screen.getByText('Avg Transaction:')).toBeInTheDocument();
      expect(screen.getByText('$50.02')).toBeInTheDocument();
    });
  });

  describe('Visual Improvements', () => {
    it('should render with improved visual hierarchy classes', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 5,
          projects: 0,
          goals: 0,
          thoughts: 0,
          moods: 0,
          focusSessions: 0,
          people: 0,
          portfolios: 0,
          spending: 0,
        }),
        getDataSummaries: () => ({
          tasks: { total: 5, active: 3, completed: 2, highPriority: 1 },
          projects: { total: 0, active: 0, completed: 0, onHold: 0 },
          goals: { total: 0, shortTerm: 0, longTerm: 0, active: 0 },
          thoughts: { total: 0, deepThoughts: 0, withSuggestions: 0 },
          moods: { total: 0, averageMood: '0', thisMonth: 0 },
          focusSessions: { total: 0, totalMinutes: 0, averageRating: '0', thisWeek: 0 },
          people: { total: 0, family: 0, friends: 0, colleagues: 0 },
          portfolios: { total: 0, totalInvestments: 0, active: 0 },
          spending: { total: 0, totalAmount: 0, thisMonth: 0, averageTransaction: '0' },
        }),
        isExporting: false,
      } as any);

      const { container } = render(<EnhancedDataManagement />);

      // Check for improved spacing classes
      expect(container.querySelector('.pt-10')).toBeInTheDocument();
      expect(container.querySelector('.space-y-6')).toBeInTheDocument();
      expect(container.querySelector('.p-8')).toBeInTheDocument();
      expect(container.querySelector('.mb-8')).toBeInTheDocument();
    });
  });

  describe('Multiple Entity Types', () => {
    it('should only show summary cards for entities with data', () => {
      mockUseImportExport.mockReturnValue({
        parseFile: jest.fn(),
        executeImport: jest.fn(),
        cancelImport: jest.fn(),
        resetImport: jest.fn(),
        parsedData: null,
        importProgress: null,
        importResult: null,
        isImporting: false,
        exportData: jest.fn(),
        exportAll: jest.fn(),
        getAvailableCounts: () => ({
          tasks: 5,
          projects: 3,
          goals: 0,
          thoughts: 0,
          moods: 0,
          focusSessions: 0,
          people: 0,
          portfolios: 0,
          spending: 10,
        }),
        getDataSummaries: () => ({
          tasks: { total: 5, active: 3, completed: 2, highPriority: 1 },
          projects: { total: 3, active: 2, completed: 1, onHold: 0 },
          goals: { total: 0, shortTerm: 0, longTerm: 0, active: 0 },
          thoughts: { total: 0, deepThoughts: 0, withSuggestions: 0 },
          moods: { total: 0, averageMood: '0', thisMonth: 0 },
          focusSessions: { total: 0, totalMinutes: 0, averageRating: '0', thisWeek: 0 },
          people: { total: 0, family: 0, friends: 0, colleagues: 0 },
          portfolios: { total: 0, totalInvestments: 0, active: 0 },
          spending: { total: 10, totalAmount: 500, thisMonth: 5, averageTransaction: '50.00' },
        }),
        isExporting: false,
      } as any);

      render(<EnhancedDataManagement />);

      // Should show summary cards for Tasks, Projects, and Transactions
      // Check that these entity types appear in the Detailed Insights section
      expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);

      // Verify detailed metrics are shown for entities with data
      expect(screen.getAllByText('Active:').length).toBeGreaterThanOrEqual(2); // Tasks and Projects both have Active
      expect(screen.getAllByText('Completed:').length).toBeGreaterThanOrEqual(2); // Tasks and Projects both have Completed
      expect(screen.getByText('High Priority:')).toBeInTheDocument(); // Only Tasks has this
      expect(screen.getByText('Total Amount:')).toBeInTheDocument(); // Only Transactions has this

      // Should NOT show summary cards for entities with no data (Goals and Moods should only appear in Overview, not Detailed Insights)
      // Check that "Short-term:" doesn't exist (only in Goals detailed card)
      expect(screen.queryByText('Short-term:')).not.toBeInTheDocument();
      // Check that "Average mood:" doesn't exist (only in Moods detailed card)
      expect(screen.queryByText('Average mood:')).not.toBeInTheDocument();
    });
  });
});
