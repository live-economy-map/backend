import type { z } from 'zod';

export const generateText = async (prompt: string): Promise<string> => {
  throw new Error('Not implemented');
};

export const generateStructuredOutput = async <T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  throw new Error('Not implemented');
};
