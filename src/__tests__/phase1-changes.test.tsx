import React from 'react';
import { render, screen } from '@testing-library/react';
import { MostUsedTools } from '@/components/MostUsedTools';

// Mock dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user' },
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock('@/store/useToolUsage', () => ({
  useToolUsage: jest.fn((selector) => {
    const state = {
      usageRecords: [],
      isLoading: false,
      fromCache: false,
      hasPendingWrites: false,
      unsubscribe: null,
      subscribe: jest.fn(),
      trackToolClick: jest.fn(),
      getMostUsedTools: jest.fn(() => []),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('Phase 1 Changes Validation - Quick Fixes', () => {
  describe('Most Used Tools - No Rank Badges', () => {
    it('should render tools without rank badge elements', () => {
      const { container } = render(<MostUsedTools />);
      
      // Should not have any elements with the rank badge structure
      // The badge used to be: <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full...">
      const absoluteElements = container.querySelectorAll('[class*="absolute"]');
      const rankBadges = Array.from(absoluteElements).filter(el => 
        el.className.includes('-top-2') && 
        el.className.includes('-right-2') &&
        el.className.includes('rounded-full')
      );
      expect(rankBadges).toHaveLength(0);
    });

    it('should not display rank numbers in badge format', () => {
      const { container } = render(<MostUsedTools />);
      
      // Check for the specific badge structure that was removed
      const badgeNumbers = container.querySelectorAll('.absolute.-top-2.-right-2, .absolute[class*="-top-2"][class*="-right-2"]');
      expect(badgeNumbers).toHaveLength(0);
    });
  });

  describe('File Content Validation - Goals Page', () => {
    it('should have Title Case in goals page file content', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/goals/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should contain Title Case labels
      expect(fileContent).toContain('Short Term');
      expect(fileContent).toContain('Long Term');
      expect(fileContent).toContain('Active');
      expect(fileContent).toContain('Done');
      
      // Should NOT contain lowercase versions in labels
      expect(fileContent).not.toContain('{stats.shortTerm} tactical');
      expect(fileContent).not.toContain('{stats.longTerm} strategic');
    });
  });

  describe('File Content Validation - Tools Page', () => {
    it('should have compact header in tools page file content', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have compact spacing (py-4 not py-8)
      expect(fileContent).toContain('py-4 space-y-3');
      
      // Should not have old spacing
      expect(fileContent).not.toContain('py-8 space-y-6');
    });

    it('should have Mood renamed in tools page file content', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have "Mood" not "Mood Tracker"
      expect(fileContent).toContain('title: "Mood"');
      expect(fileContent).not.toContain('title: "Mood Tracker"');
    });
  });

  describe('File Content Validation - MostUsedTools', () => {
    it('should have Mood renamed in MostUsedTools component', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/components/MostUsedTools.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have "Mood" not "Mood Tracker"
      expect(fileContent).toContain('moodtracker: "Mood",');
      expect(fileContent).not.toContain('moodtracker: "Mood Tracker",');
    });

    it('should not have rank badge div in MostUsedTools', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/components/MostUsedTools.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should not contain rank badge structure
      expect(fileContent).not.toContain('-top-2 -right-2');
      expect(fileContent).not.toContain('Rank Badge');
    });
  });

  describe('File Content Validation - TaskInput', () => {
    it('should have simplified recurrence labels', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/components/TaskInput.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have simplified labels
      expect(fileContent).toContain('Bi-weekly</option>');
      expect(fileContent).toContain('Bi-monthly</option>');
      expect(fileContent).toContain('Half-yearly</option>');
      
      // Should NOT have parentheses explanations
      expect(fileContent).not.toContain('Bi-weekly (Every 2 weeks)</option>');
      expect(fileContent).not.toContain('Bi-monthly (Every 2 months)</option>');
      expect(fileContent).not.toContain('Half-yearly (Every 6 months)</option>');
    });
  });
});
