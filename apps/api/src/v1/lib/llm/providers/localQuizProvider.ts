import { GeneratedQuizQuestion, parseGeneratedQuestions, quizQuestionShape } from "@/v1/types/quiz.types.js";
import { buildGeneratorPrompt, QuizPromptInput } from "../../prompts/quizPrompts.js";
import { QuizLlmAdapter, QuizProviderCallConfig } from "../quizProvider.types.js";
import * as z from 'zod';
import { AppError } from "@/errors/AppError.js";

const DEFAULT_TIMEOUT_MS = 60_000;

class LocalQuizProvider implements QuizLlmAdapter {
    async generateQuestions(input: QuizPromptInput, {model, endpoint}: QuizProviderCallConfig): Promise<GeneratedQuizQuestion[]> {
        const controller = new AbortController();
        const quizJsonSchema = z.toJSONSchema(z.array(quizQuestionShape));
        const headers = {
            'Content-Type': 'application/json',
        }
        const body = JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: buildGeneratorPrompt(input)
                }
            ],
            format: quizJsonSchema,
            stream: false,
        });
    
        const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    
        try {
        const response = await fetch(`${endpoint}/api/chat`, {
            method: 'POST',
            headers,
            body
        });
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const interaction = await response.json();
        console.log('Raw output from LocalQuizProvider.generateQuestions:', interaction);
        return parseGeneratedQuestions(interaction.message.content ?? '[]', input.questionCount);
        } catch (error) {
        console.error('Error generating quiz questions:', error);
        if (error instanceof AppError) {
            throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
            throw new AppError('Local LLM request timed out', 504);
        }
        throw new AppError('Failed to reach Local LLM', 502);
        } finally {
        clearTimeout(timeout);
        }
    }
}

export default new LocalQuizProvider();