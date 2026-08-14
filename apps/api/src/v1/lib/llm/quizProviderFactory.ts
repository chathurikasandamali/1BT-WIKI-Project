/**
 * Resolves the active QuizGenerationProvider from the admin-configurable
 * quiz_llm_config setting (provider/model/apiKey), so switching providers or
 * rotating credentials never requires touching quizService.ts.
 */

import { AppError } from '@errors/AppError.js';
import type { QuizLlmProviderName } from '@models/settings.types.js';
import settingsService, { type SettingsService } from '@services/settingsService.js';
import { geminiQuizProvider } from '@v1/lib/llm/providers/geminiQuizProvider.js';
import type { QuizGenerationProvider, QuizLlmAdapter } from '@v1/lib/llm/quizProvider.types.js';

// Adding a provider = one new adapter file + one entry here (plus the name in
// QuizLlmProviderName / quizLlmConfigSchema in settings.types.ts).
const PROVIDERS: Record<QuizLlmProviderName, QuizLlmAdapter> = {
  gemini: geminiQuizProvider,
};

export const createDynamicQuizProvider = (
  deps: Pick<SettingsService, 'getQuizLlmConfig'>
): QuizGenerationProvider => ({
  generateQuestions: async (input) => {
    const { provider, model, apiKey } = await deps.getQuizLlmConfig();
    const impl = PROVIDERS[provider];
    if (!impl) {
      throw new AppError(`Unknown quiz LLM provider: ${provider}`, 500);
    }
    return impl.generateQuestions(input, { model, apiKey });
  },
});

export default createDynamicQuizProvider(settingsService);
