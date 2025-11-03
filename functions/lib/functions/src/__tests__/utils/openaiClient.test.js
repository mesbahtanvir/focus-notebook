"use strict";
/**
 * Unit tests for OpenAI Client
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Set environment variable BEFORE importing (CONFIG is evaluated at import time)
process.env.OPENAI_API_KEY = 'sk-test-key';
// Mock the config module to ensure API key is set
jest.mock('../../config', () => ({
    CONFIG: {
        OPENAI_API_KEY: 'sk-test-key',
        MODELS: {
            DEFAULT: 'gpt-4o',
            FALLBACK: 'gpt-4o',
        },
    },
}));
const openaiClient_1 = require("../../utils/openaiClient");
const toolSpecs_1 = require("../../../../shared/toolSpecs");
// Mock fetch
global.fetch = jest.fn();
describe('OpenAI Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const mockContext = {
        goals: [{ id: 'g1', title: 'Test Goal', objective: 'Test' }],
        projects: [{ id: 'p1', title: 'Test Project' }],
        people: [{ id: 'per1', name: 'Sarah', shortName: 'sarah' }],
        tasks: [{ id: 't1', title: 'Test Task' }],
        moods: [{ value: 7, note: 'Good' }]
    };
    const mockToolSpecs = [(0, toolSpecs_1.getToolSpecById)('thoughts')];
    it('should call OpenAI API with correct parameters', async () => {
        var _a;
        const mockResponse = {
            choices: [{
                    message: {
                        content: JSON.stringify({
                            actions: [
                                {
                                    type: 'enhanceThought',
                                    confidence: 99,
                                    data: { improvedText: 'Enhanced text' },
                                    reasoning: 'Fixed grammar'
                                }
                            ]
                        })
                    }
                }],
            usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
            }
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        const result = await (0, openaiClient_1.callOpenAI)('test thought', mockContext, mockToolSpecs);
        expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-test-key'
            })
        }));
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0].type).toBe('enhanceThought');
        expect((_a = result.usage) === null || _a === void 0 ? void 0 : _a.total_tokens).toBe(150);
        expect(result.prompt).toContain('test thought');
        expect(result.rawResponse).toContain('Enhanced text');
    });
    it('should handle markdown-wrapped JSON responses', async () => {
        const mockResponse = {
            choices: [{
                    message: {
                        content: '```json\n{"actions": []}\n```'
                    }
                }],
            usage: { total_tokens: 100 }
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        const result = await (0, openaiClient_1.callOpenAI)('test', mockContext, mockToolSpecs);
        expect(result.actions).toEqual([]);
        expect(result.rawResponse).toContain('actions');
    });
    it('should handle non-markdown JSON responses', async () => {
        const mockResponse = {
            choices: [{
                    message: {
                        content: '{"actions": [{"type": "addTag", "confidence": 95, "data": {"tag": "test"}, "reasoning": "test"}]}'
                    }
                }],
            usage: { total_tokens: 100 }
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        const result = await (0, openaiClient_1.callOpenAI)('test', mockContext, mockToolSpecs);
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0].type).toBe('addTag');
        expect(result.prompt).toContain('test');
    });
    it('should throw error on API failure', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            json: async () => ({
                error: { message: 'API rate limit exceeded' }
            })
        });
        await expect((0, openaiClient_1.callOpenAI)('test', mockContext, mockToolSpecs)).rejects.toThrow('API rate limit exceeded');
    });
    it('should throw error on invalid JSON response', async () => {
        const mockResponse = {
            choices: [{
                    message: {
                        content: 'This is not JSON'
                    }
                }],
            usage: { total_tokens: 100 }
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        try {
            await expect((0, openaiClient_1.callOpenAI)('test', mockContext, mockToolSpecs)).rejects.toThrow('Invalid JSON response');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse OpenAI response:', 'This is not JSON');
        }
        finally {
            consoleErrorSpy.mockRestore();
        }
    });
    it('should throw error when no response content', async () => {
        const mockResponse = {
            choices: [{ message: {} }],
            usage: { total_tokens: 100 }
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        await expect((0, openaiClient_1.callOpenAI)('test', mockContext, mockToolSpecs)).rejects.toThrow('No response from OpenAI');
    });
    it('should include context in prompt', async () => {
        const mockResponse = {
            choices: [{
                    message: {
                        content: JSON.stringify({ actions: [] })
                    }
                }],
            usage: { total_tokens: 100 }
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });
        await (0, openaiClient_1.callOpenAI)('meeting with sarah', mockContext, mockToolSpecs);
        const callArgs = global.fetch.mock.calls[0][1];
        const requestBody = JSON.parse(callArgs.body);
        const prompt = requestBody.messages[1].content;
        // Check that context is included in the prompt
        expect(prompt).toContain('Sarah');
        expect(prompt).toContain('Test Goal');
        expect(prompt).toContain('Test Project');
        expect(prompt).toContain('meeting with sarah');
    });
});
//# sourceMappingURL=openaiClient.test.js.map