import axios, { AxiosError } from 'axios';
import { env } from '../config/env.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Groq free-tier model

export interface LLMResponse {
  content: string;
}

export const callLLM = async (prompt: string): Promise<LLMResponse> => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${env.LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    const content = response.data?.choices?.[0]?.message?.content ?? '';
    return { content };
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED') {
      const timeoutError = new Error('LLM request timed out');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }

    if (axiosError.response) {
      const apiError = new Error(
        `Groq API error: ${axiosError.response.status} ${JSON.stringify(axiosError.response.data)}`,
      );
      apiError.name = 'LLMResponseError';
      throw apiError;
    }

    const connectionError = new Error('Unable to reach LLM service');
    connectionError.name = 'ConnectionError';
    throw connectionError;
  }
};
