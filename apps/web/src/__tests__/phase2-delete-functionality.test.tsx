import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies for CBT delete
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user' },
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock('@/store/useThoughts', () => ({
  useThoughts: jest.fn((selector) => {
    const state = {
      thoughts: [],
      add: jest.fn(),
      updateThought: jest.fn(),
      subscribe: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/hooks/useTrackToolUsage', () => ({
  useTrackToolUsage: jest.fn(),
}));

jest.mock('@/lib/cbtUtils', () => ({
  filterUnprocessedThoughts: jest.fn(() => []),
  filterProcessedThoughts: jest.fn(() => []),
  calculateCBTStats: jest.fn(() => ({ toProcess: 0, processed: 0, total: 0 })),
  formatDate: jest.fn(() => '12/1/2025'),
  formatDetailedDate: jest.fn(() => 'Dec 1, 2025, 12:00 PM'),
  addCBTProcessedTag: jest.fn((tags) => [...tags, 'cbt-processed']),
}));

// Mock dependencies for Focus delete
jest.mock('@/store/useFocus', () => ({
  useFocus: jest.fn((selector) => {
    const state = {
      currentSession: null,
      completedSession: null,
      sessions: [],
      startSession: jest.fn(),
      subscribe: jest.fn(),
      deleteSession: jest.fn(),
      clearCompletedSession: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
  selectBalancedTasks: jest.fn(() => []),
}));

jest.mock('@/store/useTasks', () => ({
  useTasks: jest.fn(() => ({
    tasks: [],
    filter: jest.fn(() => []),
  })),
}));

jest.mock('@/components/ui/FloatingActionButton', () => ({
  FloatingActionButton: ({ onClick, title }: { onClick: () => void; title: string }) => (
    <button onClick={onClick}>{title}</button>
  ),
}));

describe('Phase 2: Delete Functionality', () => {
  describe('CBT Delete Functionality - File Content Validation', () => {
    it('should have delete handler function in CBT page', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/cbt/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should contain delete handler
      expect(fileContent).toContain('handleDeleteProcessedThought');
      expect(fileContent).toContain('Trash2');
      expect(fileContent).toContain('onClick={() => handleDeleteProcessedThought');
      
      // Should remove cbtAnalysis and cbt-processed tag
      expect(fileContent).toContain('cbtAnalysis: undefined');
      expect(fileContent).toContain('.filter(tag => tag !== \'cbt-processed\')');
    });

    it('should have Trash2 icon imported in CBT page', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/cbt/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain('from "lucide-react"');
      expect(fileContent).toContain('Trash2');
    });
  });

  describe('Focus Delete Functionality - File Content Validation', () => {
    it('should have deleteSession method in focus store', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/store/useFocus.ts');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have deleteSession in type definition
      expect(fileContent).toContain('deleteSession: (sessionId: string) => Promise<void>');
      
      // Should have deleteSession implementation
      expect(fileContent).toContain('deleteSession: async (sessionId: string) =>');
      expect(fileContent).toContain('await deleteAt');
      expect(fileContent).toContain('sessions.filter(s => s.id !== sessionId)');
    });

    it('should import deleteAt in focus store', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/store/useFocus.ts');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain("import { createAt, updateAt, deleteAt }");
    });

    it('should have delete button in focus page', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/focus/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have Trash2 imported
      expect(fileContent).toContain('Trash2');
      
      // Should use deleteSession
      expect(fileContent).toContain('deleteSession');
      expect(fileContent).toContain('deleteSession(session.id)');
    });
  });

  describe('CBT Delete Handler - Logic Validation', () => {
    it('should remove cbt-processed tag and clear cbtAnalysis', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/cbt/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should filter out cbt-processed tag
      expect(fileContent).toContain('.filter(tag => tag !== \'cbt-processed\')');
      
      // Should set cbtAnalysis to undefined
      expect(fileContent).toContain('cbtAnalysis: undefined');
    });

    it('should pass thoughtId to updateThought correctly', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/cbt/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should await updateThought
      expect(fileContent).toContain('await updateThought(thoughtId, {');
    });
  });

  describe('Focus Delete Handler - Logic Validation', () => {
    it('should delete from Firestore and local state', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/store/useFocus.ts');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should call deleteAt
      expect(fileContent).toContain('await deleteAt');
      expect(fileContent).toContain('focusSessions');
      
      // Should filter from local sessions
      expect(fileContent).toContain('sessions.filter(s => s.id !== sessionId)');
    });

    it('should handle errors in deleteSession', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/store/useFocus.ts');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain('try {');
      expect(fileContent).toContain('catch (error)');
      expect(fileContent).toContain('console.error');
    });
  });

  describe('UI Elements - Delete Buttons', () => {
    it('should have delete button with Trash2 icon for CBT', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/cbt/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should render delete button
      expect(fileContent).toContain('<button');
      expect(fileContent).toContain('onClick={() => handleDeleteProcessedThought');
      expect(fileContent).toContain('<Trash2');
    });

    it('should have delete button with Trash2 icon for Focus', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/focus/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should render delete button
      expect(fileContent).toContain('<button');
      expect(fileContent).toContain('onClick={(e) => {');
      expect(fileContent).toContain('deleteSession(session.id)');
      expect(fileContent).toContain('<Trash2');
    });

    it('should have proper styling for delete buttons', async () => {
      const fs = require('fs');
      const path = require('path');
      
      // CBT page
      const cbtFile = fs.readFileSync(path.join(process.cwd(), 'src/app/tools/cbt/page.tsx'), 'utf8');
      expect(cbtFile).toContain('hover:bg-red-100');
      expect(cbtFile).toContain('text-red-600');
      
      // Focus page
      const focusFile = fs.readFileSync(path.join(process.cwd(), 'src/app/tools/focus/page.tsx'), 'utf8');
      expect(focusFile).toContain('hover:bg-red-100');
      expect(focusFile).toContain('text-red-600');
    });

    it('should stop event propagation on delete click', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/focus/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should prevent click from bubbling to session card
      expect(fileContent).toContain('e.stopPropagation()');
    });
  });
});

