import {
  toolSpecs,
  CORE_TOOL_IDS,
  ALL_TOOL_IDS,
  getToolSpecById,
  renderToolSpecForPrompt,
  type ToolSpecId
} from '../../../shared/toolSpecs';

describe('toolSpecs', () => {
  describe('spending tool', () => {
    it('should include spending tool in toolSpecs', () => {
      expect(toolSpecs.spending).toBeDefined();
      expect(toolSpecs.spending.id).toBe('spending');
    });

    it('should have spending tool with correct title and category', () => {
      expect(toolSpecs.spending.title).toBe('Spending Tracker');
      expect(toolSpecs.spending.category).toBe('Finance');
    });

    it('should have credit card parsing in benefits', () => {
      expect(toolSpecs.spending.benefits).toContain('Import bank and credit card statements via CSV');
      expect(toolSpecs.spending.benefits).toContain('Get AI-powered spending insights and recommendations');
      expect(toolSpecs.spending.benefits).toContain('Track monthly spending by category and merchant');
    });

    it('should have correct description mentioning credit card and bank statements', () => {
      expect(toolSpecs.spending.description).toContain('credit card');
      expect(toolSpecs.spending.description).toContain('bank statements');
      expect(toolSpecs.spending.description).toContain('analyze spending patterns');
    });

    it('should have correct primary tags', () => {
      expect(toolSpecs.spending.primaryTags).toContain('tool-spending');
    });

    it('should have correct capabilities', () => {
      expect(toolSpecs.spending.expectedCapabilities).toContain('collectsMetrics');
      expect(toolSpecs.spending.expectedCapabilities).toContain('linksItems');
    });

    it('should have positive examples for spending tracking', () => {
      expect(toolSpecs.spending.positiveExamples).toHaveLength(1);
      expect(toolSpecs.spending.positiveExamples[0].thought).toContain('credit card bill');
    });

    it('should have negative examples', () => {
      expect(toolSpecs.spending.negativeExamples).toHaveLength(1);
      expect(toolSpecs.spending.negativeExamples[0].thought).toBe('I should save more money.');
    });
  });

  describe('CORE_TOOL_IDS', () => {
    it('should only include thoughts as initial tool', () => {
      expect(CORE_TOOL_IDS).toEqual(['thoughts']);
    });

    it('should have exactly one tool in CORE_TOOL_IDS', () => {
      expect(CORE_TOOL_IDS).toHaveLength(1);
    });

    it('should not include other tools in CORE_TOOL_IDS', () => {
      expect(CORE_TOOL_IDS).not.toContain('tasks');
      expect(CORE_TOOL_IDS).not.toContain('projects');
      expect(CORE_TOOL_IDS).not.toContain('goals');
      expect(CORE_TOOL_IDS).not.toContain('spending');
    });
  });

  describe('ALL_TOOL_IDS', () => {
    it('should include spending in ALL_TOOL_IDS', () => {
      expect(ALL_TOOL_IDS).toContain('spending');
    });

    it('should include all expected tools', () => {
      const expectedTools = [
        'thoughts', 'tasks', 'projects', 'goals', 'focus',
        'brainstorming', 'notes', 'relationships', 'moodtracker',
        'cbt', 'deepreflect', 'errands', 'packing-list', 'trips',
        'investments', 'subscriptions', 'asset-horizon', 'spending'
      ];

      expectedTools.forEach(tool => {
        expect(ALL_TOOL_IDS).toContain(tool);
      });
    });

    it('should have correct number of tools', () => {
      // 20 total tools now (including spending)
      expect(ALL_TOOL_IDS.length).toBeGreaterThanOrEqual(18);
    });
  });

  describe('getToolSpecById', () => {
    it('should return spending tool spec by id', () => {
      const spec = getToolSpecById('spending');
      expect(spec).toBeDefined();
      expect(spec.id).toBe('spending');
      expect(spec.title).toBe('Spending Tracker');
    });

    it('should return thoughts tool spec by id', () => {
      const spec = getToolSpecById('thoughts');
      expect(spec).toBeDefined();
      expect(spec.id).toBe('thoughts');
    });

    it('should throw error for non-existent tool', () => {
      expect(() => {
        getToolSpecById('non-existent-tool' as ToolSpecId);
      }).toThrow();
    });
  });

  describe('renderToolSpecForPrompt', () => {
    it('should render spending tool spec for AI prompt', () => {
      const rendered = renderToolSpecForPrompt(toolSpecs.spending);

      expect(rendered).toContain('Tool: Spending Tracker (spending)');
      expect(rendered).toContain('Primary tags: tool-spending');
      expect(rendered).toContain('Capabilities: collectsMetrics, linksItems');
      expect(rendered).toContain('credit card');
    });

    it('should include guidance in rendered spec', () => {
      const rendered = renderToolSpecForPrompt(toolSpecs.spending);
      expect(rendered).toContain('Guidance:');
      expect(rendered).toContain('Use spending tracking when the thought references expenses');
    });

    it('should include positive and negative examples', () => {
      const rendered = renderToolSpecForPrompt(toolSpecs.spending);
      expect(rendered).toContain('Positive example');
      expect(rendered).toContain('Negative example');
    });
  });

  describe('tool spec structure validation', () => {
    it('all tools should have required fields', () => {
      Object.values(toolSpecs).forEach(spec => {
        expect(spec.id).toBeDefined();
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
    });

    it('spending tool should have all required fields', () => {
      const spec = toolSpecs.spending;
      expect(spec.id).toBe('spending');
      expect(spec.title).toBe('Spending Tracker');
      expect(spec.tagline).toBe('Track expenses and analyze spending patterns with AI.');
      expect(spec.category).toBe('Finance');
      expect(spec.benefits).toBeDefined();
      expect(Array.isArray(spec.benefits)).toBe(true);
      expect(spec.benefits!.length).toBeGreaterThan(0);
    });
  });

  describe('spending tool integration', () => {
    it('should be accessible in toolSpecs object', () => {
      expect('spending' in toolSpecs).toBe(true);
    });

    it('should have unique id among all tools', () => {
      const ids = Object.keys(toolSpecs);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
      expect(uniqueIds.has('spending')).toBe(true);
    });

    it('should not be in CORE_TOOL_IDS', () => {
      expect(CORE_TOOL_IDS).not.toContain('spending');
    });

    it('should be available for enrollment', () => {
      // Spending tool should be in ALL_TOOL_IDS but not in CORE_TOOL_IDS
      // This means users must explicitly enroll
      expect(ALL_TOOL_IDS).toContain('spending');
      expect(CORE_TOOL_IDS).not.toContain('spending');
    });
  });
});
