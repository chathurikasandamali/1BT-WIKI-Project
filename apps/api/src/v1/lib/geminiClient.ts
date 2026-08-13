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
  type GeneratedQuizQuestion,
} from '@v1/types/quiz.types.js';
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";

// Infra constants — deliberately kept as code constants, not admin settings.
// questionCount / optionsPerQuestion come from the admin quiz_config setting.
const DEFAULT_TIMEOUT_MS = 60_000;
const GEMINI_MODEL = 'gemini-3.5-flash';

const quizJsonQuestionSchema: z.JSONType = {
  type: "object",
  properties: {
    question: { type: "string", description: "The quiz question." },
    type: {
      type: "string",
      enum: ["mcq", "single_choice", "multiple_choice"],
      description: "The type of the quiz question."
    },
    options: {
      type: "array",
      items: { type: "string" },
      description: "The options for the quiz question."
    },
    correctIndexes: {
      type: "array",
      items: { type: "number" },
      description: "The indexes of the correct options."
    },
    explanation: { type: "string", description: "The explanation for the correct answer." }
  },
  required: ["question", "type", "options", "correctIndexes", "explanation"]
};

const quizJsonSchema: z.JSONType = {
  type: "array",
  items: quizJsonQuestionSchema,
  description: "An array of quiz questions."
}

const quizSchema = z.fromJSONSchema(quizJsonSchema);


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
    const quizGenerationResponse = quizSchema.parse(JSON.parse(interaction.output_text?? ''));
    return parseGeneratedQuestions(quizGenerationResponse, input.questionCount);
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
