import type { z } from 'zod';

export const generateText = async (prompt: string): Promise<string> => {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt must not be empty');
  }

  const { callLLM } = await import('./llmClient.js');
  const response = await callLLM(prompt);
  const content = response?.content?.trim() ?? '';

  if (content.length === 0) {
    throw new Error('LLM returned an empty response');
  }

  return content;
};

export const generateStructuredOutput = async <T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  const structuredPrompt = `${prompt}\n\nRespond with ONLY valid JSON matching the required shape. No prose, no markdown fences.`;

  const { callLLM } = await import('./llmClient.js');
  const response = await callLLM(structuredPrompt);

  let parsedJson: unknown;
  try {
    const raw = response.content.trim().replace(/^```json\s*|\s*```$/g, '');
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = schema.safeParse(parsedJson);
  return result.success ? result.data : null;
};
