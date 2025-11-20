import { buildMessages, executePlaceInsights, renderTemplate } from '../placeInsights';

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
});
