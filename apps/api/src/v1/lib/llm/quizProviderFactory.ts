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
import localQuizProvider from '@v1/lib/llm/providers/localQuizProvider.js';

// Adding a provider = one new adapter file + one name in QUIZ_LLM_PROVIDER_NAMES
// (settings.types.ts) + one entry here. The compiler enforces all three stay in
// sync (missing/mistyped entries here won't build).
const PROVIDERS: Record<QuizLlmProviderName, QuizLlmAdapter> = {
  gemini: geminiQuizProvider,
  local: localQuizProvider,
};

export const createDynamicQuizProvider = (
  deps: Pick<SettingsService, 'getQuizLlmConfig'>
): QuizGenerationProvider => ({
  generateQuestions: async (input) => {
    const { provider, model, endpoint,apiKey } = await deps.getQuizLlmConfig();
    const impl = PROVIDERS[provider];
    if (!impl) {
      throw new AppError(`Unknown quiz LLM provider: ${provider}`, 500);
    }
    return impl.generateQuestions(input, { model, apiKey, endpoint });
  },
});

export default createDynamicQuizProvider(settingsService);
