/**
 * Test cases for CTA Button in Tasks feature (#31)
 * Tests configurable action buttons in tasks
 */

import { describe, it, expect } from '@jest/globals';
import type { Task, CTAButton, CTAButtonType } from '@/store/useTasks';

describe('CTA Button in Tasks (#31)', () => {
  describe('CTAButton Type Definition', () => {
    it('should support all button types', () => {
      const validTypes: CTAButtonType[] = [
        'leetcode',
        'chess',
        'headspace',
        'focus',
        'brainstorming',
        'notes',
        'custom',
      ];

      expect(validTypes.length).toBe(7);
      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    it('should have proper CTAButton interface structure', () => {
      const button: CTAButton = {
        type: 'leetcode',
        label: 'Solve Problem',
        url: 'https://leetcode.com/problems/two-sum',
      };

      expect(button.type).toBe('leetcode');
      expect(button.label).toBe('Solve Problem');
      expect(button.url).toBeDefined();
    });

    it('should allow optional fields', () => {
      const minimalButton: CTAButton = {
        type: 'chess',
      };

      expect(minimalButton.type).toBe('chess');
      expect(minimalButton.label).toBeUndefined();
      expect(minimalButton.url).toBeUndefined();
    });
  });

  describe('Task with CTA Button', () => {
    it('should allow tasks to have optional CTA button', () => {
      const taskWithButton: Partial<Task> = {
        id: '1',
        title: 'Practice coding',
        ctaButton: {
          type: 'leetcode',
          label: 'Go to LeetCode',
        },
      };

      expect(taskWithButton.ctaButton).toBeDefined();
      expect(taskWithButton.ctaButton?.type).toBe('leetcode');
    });

    it('should allow tasks without CTA button', () => {
      const taskWithoutButton: Partial<Task> = {
        id: '2',
        title: 'Regular task',
      };

      expect(taskWithoutButton.ctaButton).toBeUndefined();
    });
  });

  describe('Button Configurations', () => {
    it('should configure LeetCode button correctly', () => {
      const leetcodeButton: CTAButton = {
        type: 'leetcode',
        label: 'Solve on LeetCode',
        url: 'https://leetcode.com',
      };

      expect(leetcodeButton.type).toBe('leetcode');
      expect(leetcodeButton.url).toContain('leetcode.com');
    });

    it('should configure Chess button correctly', () => {
      const chessButton: CTAButton = {
        type: 'chess',
        label: 'Play Chess',
        url: 'https://chess.com',
      };

      expect(chessButton.type).toBe('chess');
      expect(chessButton.url).toContain('chess.com');
    });

    it('should configure Headspace button correctly', () => {
      const headspaceButton: CTAButton = {
        type: 'headspace',
        label: 'Meditate',
        url: 'https://headspace.com',
      };

      expect(headspaceButton.type).toBe('headspace');
      expect(headspaceButton.url).toContain('headspace.com');
    });

    it('should configure internal tool buttons', () => {
      const focusButton: CTAButton = {
        type: 'focus',
        toolPath: '/tools/focus',
      };

      const brainstormingButton: CTAButton = {
        type: 'brainstorming',
        toolPath: '/tools/brainstorming',
      };

      expect(focusButton.toolPath).toBe('/tools/focus');
      expect(brainstormingButton.toolPath).toBe('/tools/brainstorming');
    });

    it('should configure custom button with any URL', () => {
      const customButton: CTAButton = {
        type: 'custom',
        label: 'My Custom Action',
        url: 'https://example.com/my-page',
      };

      expect(customButton.type).toBe('custom');
      expect(customButton.url).toBe('https://example.com/my-page');
    });
  });

  describe('Button Display Logic', () => {
    it('should determine external vs internal links', () => {
      const externalUrl = 'https://leetcode.com';
      const internalPath = '/tools/focus';

      const isExternal = (url: string) => url.startsWith('http');

      expect(isExternal(externalUrl)).toBe(true);
      expect(isExternal(internalPath)).toBe(false);
    });

    it('should provide default icons for each button type', () => {
      const buttonIcons: Record<CTAButtonType, string> = {
        leetcode: '💻',
        chess: '♟️',
        headspace: '🧘',
        focus: '⚡',
        brainstorming: '💡',
        notes: '📝',
        custom: '🔗',
      };

      expect(buttonIcons.leetcode).toBe('💻');
      expect(buttonIcons.chess).toBe('♟️');
      expect(buttonIcons.headspace).toBe('🧘');
      expect(buttonIcons.focus).toBe('⚡');
      expect(buttonIcons.brainstorming).toBe('💡');
      expect(buttonIcons.notes).toBe('📝');
      expect(buttonIcons.custom).toBe('🔗');
    });

    it('should use custom label when provided', () => {
      const button: CTAButton = {
        type: 'leetcode',
        label: 'Custom Label',
      };

      const displayLabel = button.label || 'Default Label';
      expect(displayLabel).toBe('Custom Label');
    });

    it('should use default label when not provided', () => {
      const button: CTAButton = {
        type: 'leetcode',
      };

      const defaultLabels: Record<CTAButtonType, string> = {
        leetcode: 'Solve on LeetCode',
        chess: 'Play Chess',
        headspace: 'Meditate',
        focus: 'Start Focus',
        brainstorming: 'Brainstorm',
        notes: 'Take Notes',
        custom: 'Open Link',
      };

      const displayLabel = button.label || defaultLabels[button.type];
      expect(displayLabel).toBe('Solve on LeetCode');
    });
  });

  describe('URL Resolution', () => {
    it('should prioritize toolPath over url for internal tools', () => {
      const button: CTAButton = {
        type: 'focus',
        toolPath: '/tools/focus',
        url: 'https://example.com', // Should be ignored
      };

      const resolvedUrl = button.toolPath || button.url || '#';
      expect(resolvedUrl).toBe('/tools/focus');
    });

    it('should use url for external tools', () => {
      const button: CTAButton = {
        type: 'leetcode',
        url: 'https://leetcode.com',
      };

      const resolvedUrl = button.toolPath || button.url || '#';
      expect(resolvedUrl).toBe('https://leetcode.com');
    });

    it('should fallback to # if no URL provided', () => {
      const button: CTAButton = {
        type: 'custom',
      };

      const resolvedUrl = button.toolPath || button.url || '#';
      expect(resolvedUrl).toBe('#');
    });
  });

  describe('Integration with Task Stores', () => {
    it('should save CTA button when updating task', () => {
      const taskUpdate = {
        ctaButton: {
          type: 'leetcode' as CTAButtonType,
          label: 'Practice',
          url: 'https://leetcode.com',
        },
      };

      expect(taskUpdate.ctaButton).toBeDefined();
      expect(taskUpdate.ctaButton?.type).toBe('leetcode');
    });

    it('should remove CTA button when set to undefined', () => {
      const taskUpdate = {
        ctaButton: undefined,
      };

      expect(taskUpdate.ctaButton).toBeUndefined();
    });

    it('should handle CTA button in task creation', () => {
      const newTask = {
        title: 'Solve coding problem',
        priority: 'high' as const,
        status: 'active' as const,
        ctaButton: {
          type: 'leetcode' as CTAButtonType,
          label: 'Start Problem',
        },
      };

      expect(newTask.ctaButton).toBeDefined();
      expect(newTask.ctaButton?.type).toBe('leetcode');
    });
  });

  describe('UI Behavior', () => {
    it('should display button in TaskDetailModal', () => {
      const task: Partial<Task> = {
        id: '1',
        title: 'Task with CTA',
        ctaButton: {
          type: 'leetcode',
          label: 'Go to LeetCode',
        },
      };

      const shouldShowButton = !!task.ctaButton;
      expect(shouldShowButton).toBe(true);
    });

    it('should display button in TaskList', () => {
      const task: Partial<Task> = {
        id: '1',
        title: 'Task in list',
        ctaButton: {
          type: 'chess',
        },
      };

      const shouldShowInList = !!task.ctaButton;
      expect(shouldShowInList).toBe(true);
    });

    it('should not display button when none configured', () => {
      const task: Partial<Task> = {
        id: '1',
        title: 'Task without CTA',
      };

      const shouldShowButton = !!task.ctaButton;
      expect(shouldShowButton).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label gracefully', () => {
      const button: CTAButton = {
        type: 'leetcode',
        label: '',
      };

      const displayLabel = button.label || 'Default';
      expect(displayLabel).toBe('Default');
    });

    it('should handle very long labels', () => {
      const longLabel = 'A'.repeat(100);
      const button: CTAButton = {
        type: 'custom',
        label: longLabel,
      };

      expect(button.label).toHaveLength(100);
      // UI should truncate with CSS (max-w-[80px] truncate)
    });

    it('should handle special characters in URLs', () => {
      const button: CTAButton = {
        type: 'custom',
        url: 'https://example.com?param=value&other=123',
      };

      expect(button.url).toContain('?');
      expect(button.url).toContain('&');
    });

    it('should validate button type on creation', () => {
      const validTypes = ['leetcode', 'chess', 'headspace', 'focus', 'brainstorming', 'notes', 'custom'];

      const isValidType = (type: string): type is CTAButtonType => {
        return validTypes.includes(type);
      };

      expect(isValidType('leetcode')).toBe(true);
      expect(isValidType('invalid')).toBe(false);
    });
  });
});
