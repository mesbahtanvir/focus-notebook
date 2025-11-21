import {
  buildMessages,
  executePlaceInsights,
  renderTemplate,
} from '../placeInsights';

const basePromptConfig = {
  name: 'Places Insights Deep-Dive',
  model: 'openai/gpt-4o-mini',
  modelParameters: {
    temperature: 0.2,
    max_tokens: 1000,
  },
  messages: [
    { role: 'system' as const, content: 'system message' },
    {
      role: 'user' as const,
      content: 'Research {{destinationName}}{{#country}} ({{country}}){{/country}}.',
    },
  ],
};

describe('renderTemplate', () => {
  it('includes country block when provided', () => {
    const rendered = renderTemplate(basePromptConfig.messages[1].content, {
      destinationName: 'Lisbon',
      country: 'Portugal',
    });

    expect(rendered).toContain('Lisbon (Portugal)');
  });

  it('omits country block when country is missing', () => {
    const rendered = renderTemplate(basePromptConfig.messages[1].content, {
      destinationName: 'Reykjavik',
    });

    expect(rendered).toBe('Research Reykjavik.');
  });

  it('removes standalone country placeholder when country is missing', () => {
    const template = 'Visit {{destinationName}} in {{country}}';
    const rendered = renderTemplate(template, {
      destinationName: 'Tokyo',
    });

    expect(rendered).toBe('Visit Tokyo in ');
  });

  it('replaces multiple occurrences of destinationName', () => {
    const template = '{{destinationName}} is a great place. Visit {{destinationName}}!';
    const rendered = renderTemplate(template, {
      destinationName: 'Paris',
    });

    expect(rendered).toBe('Paris is a great place. Visit Paris!');
  });

  it('handles complex country conditional blocks', () => {
    const template = 'Explore {{destinationName}}{{#country}}, located in {{country}}{{/country}}.';

    // With country
    const withCountry = renderTemplate(template, {
      destinationName: 'Rome',
      country: 'Italy',
    });
    expect(withCountry).toBe('Explore Rome, located in Italy.');

    // Without country
    const withoutCountry = renderTemplate(template, {
      destinationName: 'Rome',
    });
    expect(withoutCountry).toBe('Explore Rome.');
  });
});

describe('buildMessages', () => {
  it('renders all message templates with provided data', () => {
    const messages = buildMessages(basePromptConfig, {
      destinationName: 'Barcelona',
      country: 'Spain',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe('system message');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('Barcelona');
    expect(messages[1].content).toContain('Spain');
  });

  it('renders messages without country', () => {
    const messages = buildMessages(basePromptConfig, {
      destinationName: 'Amsterdam',
    });

    expect(messages[1].content).toBe('Research Amsterdam.');
  });

  it('preserves message roles correctly', () => {
    const messages = buildMessages(basePromptConfig, {
      destinationName: 'Test',
    });

    messages.forEach((msg, idx) => {
      expect(msg.role).toBe(basePromptConfig.messages[idx].role);
    });
  });
});

describe('executePlaceInsights', () => {
  const mockClient = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  destination: { name: 'Testville', country: 'Nowhere' },
                  scores: { overall: 8 },
                }),
              },
            },
          ],
        }),
      },
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders prompt messages and parses response', async () => {
    const result = await executePlaceInsights(
      { destinationName: 'Testville', country: 'Nowhere' },
      mockClient,
      basePromptConfig
    );

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
      })
    );

    const calledMessages = mockClient.chat.completions.create.mock.calls[0][0].messages;
    expect(calledMessages).toEqual(
      buildMessages(basePromptConfig, { destinationName: 'Testville', country: 'Nowhere' })
    );

    expect(result).toEqual({
      destination: { name: 'Testville', country: 'Nowhere' },
      scores: { overall: 8 },
    });
  });

  it('throws on empty content', async () => {
    const emptyClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({ choices: [{}] }),
        },
      },
    } as any;

    await expect(
      executePlaceInsights({ destinationName: 'Ghost Town' }, emptyClient, basePromptConfig)
    ).rejects.toThrow('Empty response from OpenAI');
  });

  it('throws on null content', async () => {
    const nullClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: null } }]
          }),
        },
      },
    } as any;

    await expect(
      executePlaceInsights({ destinationName: 'Null Town' }, nullClient, basePromptConfig)
    ).rejects.toThrow('Empty response from OpenAI');
  });

  it('handles model name with slash separator', async () => {
    const configWithSlash = {
      ...basePromptConfig,
      model: 'openai/gpt-4o',
    };

    await executePlaceInsights(
      { destinationName: 'Testville' },
      mockClient,
      configWithSlash
    );

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o', // Should extract model name after slash
      })
    );
  });

  it('handles model name without slash', async () => {
    const configNoSlash = {
      ...basePromptConfig,
      model: 'gpt-4',
    };

    await executePlaceInsights(
      { destinationName: 'Testville' },
      mockClient,
      configNoSlash
    );

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4', // Should use as-is
      })
    );
  });

  it('uses default model when not specified', async () => {
    const configNoModel = {
      ...basePromptConfig,
      model: undefined as any,
    };

    await executePlaceInsights(
      { destinationName: 'Testville' },
      mockClient,
      configNoModel
    );

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini', // Should use default
      })
    );
  });

  it('uses default temperature when not specified', async () => {
    const configNoTemp = {
      ...basePromptConfig,
      modelParameters: undefined as any,
    };

    await executePlaceInsights(
      { destinationName: 'Testville' },
      mockClient,
      configNoTemp
    );

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.35, // Default temperature
        max_tokens: 12000, // Default max_tokens
      })
    );
  });

  it('uses config temperature and max_tokens when provided', async () => {
    await executePlaceInsights(
      { destinationName: 'Testville' },
      mockClient,
      basePromptConfig
    );

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.2,
        max_tokens: 1000,
      })
    );
  });

  it('parses JSON response correctly', async () => {
    const complexData = {
      destination: { name: 'Paris', country: 'France' },
      scores: { overall: 9, safety: 10, culture: 9 },
      insights: ['Great food', 'Rich history'],
    };

    const complexClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(complexData) } }],
          }),
        },
      },
    } as any;

    const result = await executePlaceInsights(
      { destinationName: 'Paris', country: 'France' },
      complexClient,
      basePromptConfig
    );

    expect(result).toEqual(complexData);
  });
});
