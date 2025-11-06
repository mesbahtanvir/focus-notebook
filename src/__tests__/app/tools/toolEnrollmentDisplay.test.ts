import { toolSpecs, CORE_TOOL_IDS, ALL_TOOL_IDS } from '../../../../shared/toolSpecs';

/**
 * Tests for tool enrollment display functionality
 * These tests verify that all enrolled tools are properly displayed to users
 */
describe('Tool Enrollment Display', () => {
  describe('Tool availability', () => {
    it('should have all tools defined in toolSpecs available for enrollment', () => {
      const toolIds = Object.keys(toolSpecs);

      // Verify we have a reasonable number of tools
      expect(toolIds.length).toBeGreaterThanOrEqual(18);

      // Verify key tools are present
      expect(toolIds).toContain('thoughts');
      expect(toolIds).toContain('tasks');
      expect(toolIds).toContain('spending');
      expect(toolIds).toContain('subscriptions');
      expect(toolIds).toContain('asset-horizon');
    });

    it('should have spending tool available for enrollment', () => {
      expect(toolSpecs.spending).toBeDefined();
      expect(ALL_TOOL_IDS).toContain('spending');
    });

    it('should have subscriptions tool available for enrollment', () => {
      expect(toolSpecs.subscriptions).toBeDefined();
      expect(ALL_TOOL_IDS).toContain('subscriptions');
    });

    it('should have asset-horizon tool available for enrollment', () => {
      expect(toolSpecs['asset-horizon']).toBeDefined();
      expect(ALL_TOOL_IDS).toContain('asset-horizon');
    });
  });

  describe('Initial enrollment behavior', () => {
    it('should only auto-enroll thoughts for new users', () => {
      expect(CORE_TOOL_IDS).toEqual(['thoughts']);
    });

    it('should not auto-enroll spending for new users', () => {
      expect(CORE_TOOL_IDS).not.toContain('spending');
    });

    it('should not auto-enroll subscriptions for new users', () => {
      expect(CORE_TOOL_IDS).not.toContain('subscriptions');
    });

    it('should not auto-enroll asset-horizon for new users', () => {
      expect(CORE_TOOL_IDS).not.toContain('asset-horizon');
    });

    it('should require users to explicitly enroll in non-core tools', () => {
      const nonCoreTools = ALL_TOOL_IDS.filter(id => !CORE_TOOL_IDS.includes(id));

      // All non-core tools should be available but not auto-enrolled
      expect(nonCoreTools.length).toBeGreaterThan(0);
      expect(nonCoreTools).toContain('spending');
      expect(nonCoreTools).toContain('tasks');
      expect(nonCoreTools).toContain('projects');
    });
  });

  describe('Tool metadata for display', () => {
    it('spending tool should have display metadata', () => {
      const spending = toolSpecs.spending;

      expect(spending.title).toBe('Spending Tracker');
      expect(spending.tagline).toBeDefined();
      expect(spending.description).toBeDefined();
      expect(spending.category).toBe('Finance');
      expect(spending.benefits).toBeDefined();
      expect(spending.benefits!.length).toBeGreaterThan(0);
    });

    it('all tools should have required display metadata', () => {
      ALL_TOOL_IDS.forEach(toolId => {
        const spec = toolSpecs[toolId];

        expect(spec.id).toBe(toolId);
        expect(spec.title).toBeDefined();
        expect(spec.description).toBeDefined();

        // These are optional but commonly used
        if (spec.tagline) {
          expect(typeof spec.tagline).toBe('string');
        }
        if (spec.category) {
          expect(typeof spec.category).toBe('string');
        }
        if (spec.benefits) {
          expect(Array.isArray(spec.benefits)).toBe(true);
        }
      });
    });
  });

  describe('Tool categorization for AI prompts', () => {
    it('should pass spending tool data to AI when enrolled', () => {
      const spending = toolSpecs.spending;

      // Verify the tool has the necessary data for AI categorization
      expect(spending.primaryTags).toContain('tool-spending');
      expect(spending.expectedCapabilities).toBeDefined();
      expect(spending.guidance).toBeDefined();
      expect(spending.positiveExamples).toBeDefined();
      expect(spending.negativeExamples).toBeDefined();
    });

    it('should have proper guidance for spending categorization', () => {
      const spending = toolSpecs.spending;

      // Check that guidance includes relevant keywords
      const guidanceText = spending.guidance.join(' ');
      expect(guidanceText.toLowerCase()).toContain('spending');
      expect(guidanceText.toLowerCase()).toContain('expense');
    });

    it('should have examples for AI training', () => {
      const spending = toolSpecs.spending;

      expect(spending.positiveExamples.length).toBeGreaterThan(0);
      expect(spending.negativeExamples.length).toBeGreaterThan(0);

      // Verify examples have required structure
      spending.positiveExamples.forEach(example => {
        expect(example.thought).toBeDefined();
        expect(example.rationale).toBeDefined();
        expect(example.recommendedActions).toBeDefined();
      });
    });
  });

  describe('Tool page consistency', () => {
    it('should have all tools from toolSpecs available for display', () => {
      const specIds = Object.keys(toolSpecs);
      const allToolIds = ALL_TOOL_IDS;

      // ALL_TOOL_IDS should match keys in toolSpecs
      expect(allToolIds.sort()).toEqual(specIds.sort());
    });

    it('should not have orphaned tools in CORE_TOOL_IDS', () => {
      // Every tool in CORE_TOOL_IDS should exist in toolSpecs
      CORE_TOOL_IDS.forEach(toolId => {
        expect(toolSpecs[toolId]).toBeDefined();
      });
    });
  });

  describe('Finance category tools', () => {
    it('should have multiple finance tools available', () => {
      const financeTools = Object.values(toolSpecs).filter(
        spec => spec.category === 'Finance'
      );

      expect(financeTools.length).toBeGreaterThanOrEqual(3);

      const financeToolIds = financeTools.map(spec => spec.id);
      expect(financeToolIds).toContain('spending');
      expect(financeToolIds).toContain('subscriptions');
      expect(financeToolIds).toContain('investments');
    });

    it('finance tools should have consistent category label', () => {
      expect(toolSpecs.spending.category).toBe('Finance');
      expect(toolSpecs.subscriptions.category).toBe('Finance');
      expect(toolSpecs.investments.category).toBe('Finance');
      expect(toolSpecs['asset-horizon'].category).toBe('Finance');
    });
  });

  describe('Tool enrollment filtering', () => {
    it('should allow filtering enrolled tools from all tools', () => {
      // Simulate enrolled tools
      const enrolledToolIds = ['thoughts', 'tasks', 'spending'];

      const enrolledTools = ALL_TOOL_IDS.filter(id => enrolledToolIds.includes(id));

      expect(enrolledTools).toContain('thoughts');
      expect(enrolledTools).toContain('tasks');
      expect(enrolledTools).toContain('spending');
      expect(enrolledTools).not.toContain('projects');
    });

    it('should show all tools in marketplace regardless of enrollment', () => {
      // In marketplace, all tools should be visible
      expect(ALL_TOOL_IDS.length).toBe(Object.keys(toolSpecs).length);
    });
  });

  describe('Tool spec validation for newly added tools', () => {
    const newTools = ['spending']; // Tools added in this update

    newTools.forEach(toolId => {
      describe(`${toolId} tool`, () => {
        it('should be properly defined in toolSpecs', () => {
          expect(toolSpecs[toolId]).toBeDefined();
        });

        it('should have all required fields', () => {
          const spec = toolSpecs[toolId];

          expect(spec.id).toBe(toolId);
          expect(spec.title).toBeDefined();
          expect(spec.description).toBeDefined();
          expect(spec.primaryTags).toBeDefined();
          expect(Array.isArray(spec.primaryTags)).toBe(true);
          expect(spec.expectedCapabilities).toBeDefined();
          expect(Array.isArray(spec.expectedCapabilities)).toBe(true);
          expect(spec.guidance).toBeDefined();
          expect(Array.isArray(spec.guidance)).toBe(true);
          expect(spec.positiveExamples).toBeDefined();
          expect(Array.isArray(spec.positiveExamples)).toBe(true);
          expect(spec.negativeExamples).toBeDefined();
          expect(Array.isArray(spec.negativeExamples)).toBe(true);
        });

        it('should be included in ALL_TOOL_IDS', () => {
          expect(ALL_TOOL_IDS).toContain(toolId);
        });

        it('should not be in CORE_TOOL_IDS initially', () => {
          // New tools should require explicit enrollment
          expect(CORE_TOOL_IDS).not.toContain(toolId);
        });
      });
    });
  });
});
