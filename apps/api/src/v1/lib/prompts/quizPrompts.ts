/**
 * Versioned prompts for the quiz generation via Gemini.
 * Bump PROMPT_VERSION whenever the prompt changes so stored quizzes
 * (config_snapshot) record which prompt produced them.
 */

export interface QuizPromptInput {
  articleTitle: string;
  articleText: string;
  questionCount: number;
  optionsPerQuestion: number;
}

export const PROMPT_VERSION = '1.0.0';

/**
 * Prompt for the generator agent: produce N mixed-type questions as strict JSON.
 */
export const buildGeneratorPrompt = ({
  articleTitle,
  articleText,
  questionCount,
  optionsPerQuestion,
}: QuizPromptInput): string => `You are a quiz generator for an internal knowledge base.
Generate exactly ${questionCount} quiz questions based ONLY on the article below.
Do not use any outside knowledge; every question and answer must be verifiable from the article text.

Mix the question types across the quiz. Allowed types:
- "mcq": a classic multiple-choice question with exactly one correct option
- "single_choice": a statement/judgement question with exactly one correct option
- "multiple_choice": a question where two or more options are correct

Rules:
- Each question has exactly ${optionsPerQuestion} options.
- "correctIndexes" holds the zero-based indexes of the correct options.
- "mcq" and "single_choice" questions must have exactly one entry in "correctIndexes".
- "multiple_choice" questions must have at least two entries in "correctIndexes".
- Keep questions clear, self-contained, and free of "according to the article" phrasing.

Return ONLY a JSON array with this exact structure — no markdown, no commentary:
[
  {
    "question": "Question text",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndexes": [0],
    "explanation": "Brief explanation of the correct answer(s)"
  }
]

Article Title: ${articleTitle}
Article Content:
${articleText}`;

/**
 * Prompt for the validator agent: verify the generator output against the
 * article and the JSON contract, repairing it when possible.
 */
export const buildValidatorPrompt = ({
  articleTitle,
  articleText,
  questionCount,
  optionsPerQuestion,
}: QuizPromptInput): string => `You are a quiz validator. You receive a candidate quiz (JSON array) generated from the article below.
Check every question against these rules and fix violations where possible:
1. Exactly ${questionCount} questions, each with exactly ${optionsPerQuestion} options.
2. Every question and its correct answer(s) are grounded in the article — discard and replace anything the article does not support.
3. "type" is one of "mcq", "single_choice", "multiple_choice".
4. "correctIndexes" contains exactly one index for "mcq"/"single_choice" and at least two for "multiple_choice", all within the options range.
5. Exactly one unambiguous correct answer set per question; distractors must be plausible but clearly wrong.
6. Output is valid JSON matching the generator schema — no markdown fences, no commentary.

Return ONLY the corrected JSON array.

Article Title: ${articleTitle}
Article Content:
${articleText}`;
