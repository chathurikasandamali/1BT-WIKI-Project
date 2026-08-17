/**
 * Provider abstraction for quiz-generation LLMs.
 * Domain owner: ai-integration-engineer
 */

import type { QuizPromptInput } from '@v1/lib/prompts/quizPrompts.js';
import type { GeneratedQuizQuestion } from '@v1/types/quiz.types.js';

/** Per-call model/credentials, resolved from the admin quiz_llm_config setting. */
export interface QuizProviderCallConfig {
  model: string;
  endpoint: string | undefined;
  apiKey: string | undefined;
}

/**
 * Implemented once per LLM vendor (Gemini, OpenAI, ...) by an adapter in
 * `lib/llm/providers/`. Takes the resolved model/apiKey per call so a live
 * admin config change applies without a restart.
 */
export interface QuizLlmAdapter {
  generateQuestions(
    input: QuizPromptInput,
    config: QuizProviderCallConfig
  ): Promise<GeneratedQuizQuestion[]>;
}

/**
 * What `quizService.ts` actually depends on — config resolution (which
 * vendor, which model/key) is already baked in by `quizProviderFactory.ts`,
 * so the service never needs to know about vendors or credentials.
 */
export interface QuizGenerationProvider {
  generateQuestions(input: QuizPromptInput): Promise<GeneratedQuizQuestion[]>;
}
