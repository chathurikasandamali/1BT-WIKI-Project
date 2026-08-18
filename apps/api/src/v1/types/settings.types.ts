/**
 * Types + validation for the admin-configurable app_settings store.
 *
 * Settings live in a single key-value DB table (`app_settings`) and are grouped
 * by `category` so related settings (e.g. everything quiz-related) can be listed
 * and edited together. Categories are an application-level allow-list (below),
 * not a DB enum, so adding a new category never requires a migration.
 *
 * Domain owner: all roles via PR (shared infrastructure). Each setting's
 * domain owner (e.g. ai-integration-engineer for quiz settings) is responsible
 * for wiring its consumption.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Allowed setting categories. Keep this sorted and only add a category when a
 * real setting needs it — each entry should be paired with a key in
 * SETTING_DEFINITIONS.
 */
export const SETTING_CATEGORIES = [
  'quiz',
  'article',
  'comment',
  'techTalk',
  'pagination',
  'general',
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Quiz settings
// ---------------------------------------------------------------------------

/** Runtime-configurable quiz generation settings. */
export interface QuizConfig {
  /** Number of questions generated per quiz. */
  questionCount: number;
  /** Options rendered per question. */
  optionsPerQuestion: number;
}

/**
 * Fallback used when no DB row exists yet. Mirrors the historical code
 * constants DEFAULT_QUESTION_COUNT / OPTIONS_PER_QUESTION.
 */
export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  questionCount: 10,
  optionsPerQuestion: 4,
};

/**
 * Validation for quiz settings. Bounds intentionally generous: the admin panel
 * surfaces them, but a rogue value must never break the Gemini call or prompt.
 */
export const quizConfigSchema = z.object({
  questionCount: z.number().int().min(1).max(50),
  optionsPerQuestion: z.number().int().min(2).max(8),
});

/**
 * Every quiz LLM provider that has an adapter in lib/llm/providers/. Single
 * source of truth for the allowed provider set — QuizLlmProviderName and
 * quizLlmConfigSchema's validation both derive from it, so extending providers
 * never means updating two independent lists that could drift out of sync.
 */
export const QUIZ_LLM_PROVIDER_NAMES = ['gemini', 'local'] as const;

/** LLM providers supported for quiz generation. Extend by adding a name to QUIZ_LLM_PROVIDER_NAMES. */
export type QuizLlmProviderName = (typeof QUIZ_LLM_PROVIDER_NAMES)[number];

/** Runtime-configurable LLM provider settings for quiz generation. */
export interface QuizLlmConfig {
  provider: QuizLlmProviderName;
  model: string;
  endpoint?: string;
  apiKey?: string;
}

/**
 * Fallback used when no DB row exists yet. `apiKey` bootstraps from the
 * legacy env var so existing deployments keep working before an admin sets
 * one via the settings panel.
 */
export const DEFAULT_QUIZ_LLM_CONFIG: QuizLlmConfig = {
  provider: 'local',
  model: 'qwen2.5vl',
  endpoint: 'http://192.168.8.105:11434',
  apiKey: undefined,
};

export const quizLlmConfigSchema = z
  .object({
    provider: z.enum(QUIZ_LLM_PROVIDER_NAMES),
    model: z.string().min(1),
    endpoint: z.string().optional(),
    apiKey: z.string().optional(),
  })
  .transform((val) => (val.provider === 'local' ? val : { ...val, endpoint: undefined }));

// ---------------------------------------------------------------------------
// Typed registry
// ---------------------------------------------------------------------------

/**
 * Maps every category → key → value type. Adding a setting means adding an
 * entry here plus a matching entry in SETTING_DEFINITIONS below — the compiler
 * then guarantees getSetting/updateSetting stay fully typed.
 */
export interface SettingValueMap {
  quiz: { quiz_config: QuizConfig; quiz_llm_config: QuizLlmConfig };
  article: Record<string, never>;
  comment: Record<string, never>;
  techTalk: Record<string, never>;
  pagination: Record<string, never>;
  general: Record<string, never>;
}

/** Describes one setting: its Zod schema and the fallback value. */
export interface SettingDefinition<TValue> {
  schema: z.ZodType<TValue>;
  defaultValue: TValue;
}

/**
 * Concrete definitions for every known setting. The structure is enforced by
 * SettingValueMap — a key that exists in the map but not here (or vice versa)
 * is a compile error.
 */
export const SETTING_DEFINITIONS: {
  [C in SettingCategory]: {
    [K in keyof SettingValueMap[C]]: SettingDefinition<SettingValueMap[C][K]>;
  };
} = {
  quiz: {
    quiz_config: { schema: quizConfigSchema, defaultValue: DEFAULT_QUIZ_CONFIG },
    quiz_llm_config: { schema: quizLlmConfigSchema, defaultValue: DEFAULT_QUIZ_LLM_CONFIG },
  },
  article: {},
  comment: {},
  techTalk: {},
  pagination: {},
  general: {},
};

// ---------------------------------------------------------------------------
// Sensitive fields — masked in API responses, never in stored/validated data
// ---------------------------------------------------------------------------

/**
 * (category, key) → field names that must be masked before a setting value
 * leaves the API (list/get/update responses). The DB and internal service
 * accessors (e.g. getQuizLlmConfig) always see the real value.
 */
export const SENSITIVE_SETTING_FIELDS: Partial<
  Record<SettingCategory, Record<string, readonly string[]>>
> = {
  quiz: { quiz_llm_config: ['apiKey'] },
};
