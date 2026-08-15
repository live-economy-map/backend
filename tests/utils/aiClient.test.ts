import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

// Mock the LLM client module
vi.mock('../../src/utils/llmClient.js');

describe.skip('aiClient.ts', () => {
  let mockCallLLM: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCallLLM = vi.fn();
    vi.doMock('../../src/utils/llmClient.js', () => ({
      callLLM: mockCallLLM,
    }));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateText', () => {
    it('returns plain string when SDK resolves text response', async () => {
      mockCallLLM.mockResolvedValue({ content: 'Generated summary text' });

      const { generateText } = await import('../../src/utils/aiClient.js');
      const result = await generateText('Summarize this');

      expect(result).toBe('Generated summary text');
      expect(mockCallLLM).toHaveBeenCalledWith('Summarize this');
    });

    it('rejects when prompt is empty', async () => {
      const { generateText } = await import('../../src/utils/aiClient.js');

      await expect(generateText('')).rejects.toThrow();
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('rejects with normalized error when SDK times out', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockCallLLM.mockRejectedValue(timeoutError);

      const { generateText } = await import('../../src/utils/aiClient.js');

      await expect(generateText('Prompt')).rejects.toThrow();
      expect(mockCallLLM).toHaveBeenCalled();
    });

    it('rejects when SDK returns empty or whitespace-only response', async () => {
      mockCallLLM.mockResolvedValue({ content: '   ' });

      const { generateText } = await import('../../src/utils/aiClient.js');

      await expect(generateText('Prompt')).rejects.toThrow();
    });
  });

  describe('generateStructuredOutput', () => {
    const testSchema = z.object({
      filters: z.object({
        minScore: z.number(),
        maxScore: z.number(),
      }),
    });

    it('resolves parsed object when SDK returns valid JSON matching schema', async () => {
      const validResponse = { filters: { minScore: 0.5, maxScore: 0.9 } };
      mockCallLLM.mockResolvedValue({ content: JSON.stringify(validResponse) });

      const { generateStructuredOutput } = await import('../../src/utils/aiClient.js');
      const result = await generateStructuredOutput('Parse this', testSchema);

      expect(result).toEqual(validResponse);
      expect(mockCallLLM).toHaveBeenCalled();
    });

    it('resolves null when SDK returns malformed/non-JSON text', async () => {
      mockCallLLM.mockResolvedValue({ content: 'This is just prose, not JSON' });

      const { generateStructuredOutput } = await import('../../src/utils/aiClient.js');
      const result = await generateStructuredOutput('Parse this', testSchema);

      expect(result).toBeNull();
    });

    it('resolves null when SDK returns JSON with wrong schema shape', async () => {
      const wrongShape = { unexpectedKey: 'value' };
      mockCallLLM.mockResolvedValue({ content: JSON.stringify(wrongShape) });

      const { generateStructuredOutput } = await import('../../src/utils/aiClient.js');
      const result = await generateStructuredOutput('Parse this', testSchema);

      expect(result).toBeNull();
    });

    it('rejects when SDK service is unreachable (connection error)', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.name = 'ConnectionError';
      mockCallLLM.mockRejectedValue(connectionError);

      const { generateStructuredOutput } = await import('../../src/utils/aiClient.js');

      await expect(generateStructuredOutput('Parse this', testSchema)).rejects.toThrow();
    });

    it('distinguishes "null result" from "service error"', async () => {
      // First call: malformed → null (graceful)
      mockCallLLM.mockResolvedValueOnce({ content: 'not json' });
      const { generateStructuredOutput } = await import('../../src/utils/aiClient.js');
      const resultNull = await generateStructuredOutput('Parse', testSchema);
      expect(resultNull).toBeNull();

      // Second call: service down → throw (error signal)
      mockCallLLM.mockRejectedValueOnce(new Error('Service unavailable'));
      await expect(generateStructuredOutput('Parse', testSchema)).rejects.toThrow();
    });
  });
});
