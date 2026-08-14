/**
 * Gemini adapter for the QuizGenerationProvider interface.
 *
 * Model and API key are passed in per call (from the admin quiz_llm_config
 * setting) rather than read from env/constants here, so an admin change
 * takes effect on the next request without a restart.
 */

import { AppError } from '@errors/AppError.js';
import {
  buildGeneratorPrompt,
  type QuizPromptInput,
} from '@v1/lib/prompts/quizPrompts.js';
import {
  parseGeneratedQuestions,
  quizQuestionShape,
  type GeneratedQuizQuestion,
} from '@v1/types/quiz.types.js';
import type { QuizLlmAdapter, QuizProviderCallConfig } from '@v1/lib/llm/quizProvider.types.js';
import { GoogleGenAI } from '@google/genai';
import * as z from 'zod';

const DEFAULT_TIMEOUT_MS = 60_000;

// Derived from the same schema quiz.types.ts uses to validate the response,
// so Gemini's requested output shape and our runtime validation can't drift.
const quizJsonSchema = z.toJSONSchema(z.array(quizQuestionShape));

const generateQuestions = async (
  input: QuizPromptInput,
  { model, apiKey }: QuizProviderCallConfig
): Promise<GeneratedQuizQuestion[]> => {
  const controller = new AbortController();
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  });

  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const interaction = await ai.interactions.create({
      model,
      input: buildGeneratorPrompt(input),
      stream: false,
      response_format: {
        schema: quizJsonSchema,
        mime_type: 'application/json',
        type: 'text',
      },
    });

    console.log('Raw output from geminiQuizProvider.generateQuestions:', interaction);
    return parseGeneratedQuestions(interaction.output_text ?? '', input.questionCount);
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('Gemini request timed out', 504);
    }
    throw new AppError('Failed to reach Gemini', 502);
  } finally {
    clearTimeout(timeout);
  }
};

export const geminiQuizProvider: QuizLlmAdapter = { generateQuestions };

export default geminiQuizProvider;
