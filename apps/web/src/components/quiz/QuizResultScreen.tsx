'use client';

import type { QuizSubmitResponse } from '@/lib/api/articles';
import { cn } from '@/lib/utils';

interface QuizResultScreenProps {
  result: QuizSubmitResponse;
}

export function QuizResultScreen({ result }: QuizResultScreenProps) {
  return (
    <div data-cy="quiz-result-screen" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 rounded-xl bg-brand-bg px-4 py-6 text-center">
        <span className="text-3xl font-bold text-brand-text-primary">
          {result.scorePercent}%
        </span>
        <span className="text-sm text-brand-text-secondary">
          {result.correctCount} correct, {result.incorrectCount} incorrect out of{' '}
          {result.totalQuestions} questions
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {result.results.map((question, index) => (
          <div key={question.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Question {index + 1} of {result.totalQuestions}
              {question.isCorrect ? (
                <span className="ml-2 text-green-600">Correct</span>
              ) : (
                <span className="ml-2 text-brand-red">Incorrect</span>
              )}
            </p>
            <p className="mb-4 text-base font-semibold text-brand-text-primary">
              {question.question}
            </p>
            <div className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => {
                const isSelected = question.selected.includes(optionIndex);
                const isCorrectOption = question.correctIndexes.includes(optionIndex);

                let optionClasses = 'border-brand-border text-brand-text-primary';
                if (isCorrectOption) {
                  optionClasses = 'border-green-600 bg-green-50 text-brand-text-primary';
                } else if (isSelected) {
                  optionClasses = 'border-brand-red bg-red-50 text-brand-text-primary';
                }

                return (
                  <div
                    key={optionIndex}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm',
                      optionClasses
                    )}
                  >
                    <span>{option}</span>
                    {isSelected && !isCorrectOption && (
                      <span className="text-xs font-semibold text-brand-red">
                        Your answer
                      </span>
                    )}
                    {isCorrectOption && (
                      <span className="text-xs font-semibold text-green-600">
                        Correct answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
