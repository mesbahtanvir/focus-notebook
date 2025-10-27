import React from 'react';

// Mock dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user' },
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  })),
}));

describe('Phase 4: Back Buttons - Validation', () => {
  describe('ToolHeader Back Button Support', () => {
    it('should have showBackButton prop in ToolHeader', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/components/tools/ToolHeader.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have showBackButton prop
      expect(fileContent).toContain('showBackButton?: boolean');
      
      // Should import Link and ArrowLeft
      expect(fileContent).toContain('import Link from "next/link"');
      expect(fileContent).toContain('ArrowLeft');
      
      // Should have back button rendering logic
      expect(fileContent).toContain('showBackButton &&');
      expect(fileContent).toContain('href="/tools"');
      expect(fileContent).toContain('Back to Tools');
    });
  });

  describe('CBT Page Back Button', () => {
    it('should have showBackButton prop set to true', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/cbt/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain('showBackButton={true}');
    });
  });

  describe('Deep Reflect Page Back Button', () => {
    it('should have showBackButton prop set to true', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/deepreflect/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain('showBackButton={true}');
    });
  });

  describe('Thoughts Page Back Button', () => {
    it('should have showBackButton prop set to true', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/app/tools/thoughts/page.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain('showBackButton={true}');
    });
  });

  describe('Back Button Rendering', () => {
    it('should render back button with proper styling', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src/components/tools/ToolHeader.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Should have proper Link component with ArrowLeft icon
      expect(fileContent).toContain('<Link');
      expect(fileContent).toContain('href="/tools"');
      expect(fileContent).toContain('<ArrowLeft');
      
      // Should have proper styling classes
      expect(fileContent).toContain('text-sm text-gray-600');
      expect(fileContent).toContain('hover:text-gray-900');
      expect(fileContent).toContain('mb-2');
      expect(fileContent).toContain('transition-colors');
    });
  });
});

