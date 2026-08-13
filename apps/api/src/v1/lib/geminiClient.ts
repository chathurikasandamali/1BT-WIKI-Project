/**
 * HTTP client for the Gemini quiz-generation API.
 *
 * Env:
 * - GEMINI_API_KEY — Gemini API key (required at call time)
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
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";

// Infra constants — deliberately kept as code constants, not admin settings.
// questionCount / optionsPerQuestion come from the admin quiz_config setting.
const DEFAULT_TIMEOUT_MS = 60_000;
const GEMINI_MODEL = 'gemini-3.5-flash';

// Derived from the same schema quiz.types.ts uses to validate the response,
// so Gemini's requested output shape and our runtime validation can't drift.
const quizJsonSchema = z.toJSONSchema(z.array(quizQuestionShape));

const generateQuestions = async (
  input: QuizPromptInput
): Promise<GeneratedQuizQuestion[]> => {
  const controller = new AbortController();
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "Content-Type": "application/json",
      }
    },
  });

  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input: buildGeneratorPrompt(input),
      stream: false,
      response_format: {
        schema: quizJsonSchema,
        mime_type: "application/json",
        type: "text"
      }
    });

    console.log("Raw output from geminiClient.generateQuestions:", interaction);
    return parseGeneratedQuestions(interaction.output_text ?? '', input.questionCount);
  } catch (error) {
    console.error("Error generating quiz questions:", error);
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

export default { generateQuestions };
