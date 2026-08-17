/**
 * Service for the admin-configurable app_settings store.
 *
 * Reads merge stored (possibly partial) values over code defaults and validate
 * the result via the Zod schemas in settings.types.ts. Writes accept a partial
 * PATCH, merge over the current effective value, validate the full result, and
 * persist it — so the DB always holds a complete, valid config.
 */

import SettingsRepository from '@repositories/settingsRepository.js';
import { AppError } from '@errors/AppError.js';
import { z } from 'zod';
import {
  SETTING_CATEGORIES,
  SETTING_DEFINITIONS,
  type SettingCategory,
  type SettingDefinition,
  type QuizConfig,
  type QuizLlmConfig,
} from '@models/settings.types.js';

export interface SettingsServiceDeps {
  settingsRepository: typeof SettingsRepository;
}

/** Turn a ZodError into a readable 400 message, e.g. "questionCount must be ≥ 1". */
const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'value'} ${issue.message}`)
    .join('; ');

/**
 * Creates the settings service with injected dependencies so callers can
 * supply mocks (tests) or the production singleton (default export).
 */
export const createSettingsService = (deps: SettingsServiceDeps) => {
  const { settingsRepository } = deps;

  /** Resolve a (category, key) pair to its definition, throwing 400 when unknown. */
  const definitionFor = (
    category: SettingCategory,
    key: string
  ): SettingDefinition<unknown> => {
    if (!SETTING_CATEGORIES.includes(category)) {
      throw new AppError(`Unknown setting category: ${category}`, 400);
    }
    const categoryDefs = SETTING_DEFINITIONS[category] as Record<
      string,
      SettingDefinition<unknown>
    >;
    const def = categoryDefs[key];
    if (!def) {
      throw new AppError(`Unknown setting: ${category}/${key}`, 400);
    }
    return def;
  };

  /**
   * Read the effective value of a setting: stored value merged over the code
   * default, then validated. Invalid stored data falls back to defaults rather
   * than breaking callers (e.g. quiz generation).
   */
  const getSetting = async (
    category: SettingCategory,
    key: string
  ): Promise<unknown> => {
    const def = definitionFor(category, key);
    const row = await settingsRepository.findByKey(key);

    try {
      const merged = { ...(def.defaultValue as object), ...(row?.value ?? {}) };
      return def.schema.parse(merged);
    } catch (error) {
      console.error(
        `[SettingsService] Invalid stored value for ${category}/${key}, falling back to defaults:`,
        error
      );
      return def.defaultValue;
    }
  };

  /**
   * List every setting in a category as key → effective value. Returns an empty
   * object for a valid category that has no settings defined yet.
   */
  const listByCategory = async (
    category: SettingCategory
  ): Promise<Record<string, unknown>> => {
    if (!SETTING_CATEGORIES.includes(category)) {
      throw new AppError(`Unknown setting category: ${category}`, 400);
    }

    const rows = await settingsRepository.findByCategory(category);
    const categoryDefs = SETTING_DEFINITIONS[category] as Record<
      string,
      SettingDefinition<unknown>
    >;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(categoryDefs)) {
      const def = categoryDefs[key];
      const row = rows.find((r) => r.key === key);

      try {
        const merged = { ...(def.defaultValue as object), ...(row?.value ?? {}) };
        result[key] = def.schema.parse(merged);
      } catch (error) {
        console.error(
          `[SettingsService] Invalid stored value for ${category}/${key}, falling back to defaults:`,
          error
        );
        result[key] = def.defaultValue;
      }
    }

    return result;
  };

  /**
   * Partial-update a setting (PATCH semantics): merge over the current
   * effective value, validate the full result, and persist it.
   *
   * @throws AppError 400 — unknown setting, or the merged value fails validation
   */
  const updateSetting = async (
    category: SettingCategory,
    key: string,
    patch: Record<string, unknown>,
    updatedBy: string | null
  ): Promise<unknown> => {
    const def = definitionFor(category, key);
    const row = await settingsRepository.findByKey(key);
    const current = { ...(def.defaultValue as object), ...(row?.value ?? {}) };
    const merged = { ...current, ...patch };

    let parsed: unknown;
    try {
      parsed = def.schema.parse(merged);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(`Invalid setting value: ${formatZodError(error)}`, 400);
      }
      throw error;
    }

    await settingsRepository.upsert(
      key,
      category,
      parsed as Record<string, unknown>,
      updatedBy
    );
    return parsed;
  };

  /**
   * Convenience accessor for the quiz generation settings — the only typed
   * getter today. Consumers inside the quiz domain should use this instead of
   * the generic string-keyed getSetting.
   */
  const getQuizConfig = async (): Promise<QuizConfig> =>
    (await getSetting('quiz', 'quiz_config')) as QuizConfig;

  /**
   * Convenience accessor for the quiz LLM provider settings (provider, model,
   * API key). Returns the real, unmasked value — only for internal use by the
   * quiz generation pipeline, never surfaced directly to controllers.
   */
  const getQuizLlmConfig = async (): Promise<QuizLlmConfig> =>
    (await getSetting('quiz', 'quiz_llm_config')) as QuizLlmConfig;

  return { getSetting, listByCategory, updateSetting, getQuizConfig, getQuizLlmConfig };
};

export type SettingsService = ReturnType<typeof createSettingsService>;

export default createSettingsService({ settingsRepository: SettingsRepository });
