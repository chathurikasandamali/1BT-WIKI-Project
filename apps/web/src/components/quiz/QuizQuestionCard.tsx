'use client';

import type { QuizQuestionPublic } from '@/lib/api/articles';
import { cn } from '@/lib/utils';

interface QuizQuestionCardProps {
  question: QuizQuestionPublic;
  /** Selected option indexes. Omit for a read-only review card (author mode). */
  selected?: number[];
  /** Provide to make the card interactive (reader mode). */
  onChange?: (selected: number[]) => void;
  /** Optional 1-based label shown above the question, e.g. for review lists. */
  label?: string;
}

export function QuizQuestionCard({
  question,
  selected = [],
  onChange,
  label,
}: QuizQuestionCardProps) {
  const isMultiSelect = question.type === 'multiple_choice';
  const isInteractive = typeof onChange === 'function';

  const toggleOption = (optionIndex: number) => {
    if (!onChange) return;

    if (isMultiSelect) {
      onChange(
        selected.includes(optionIndex)
          ? selected.filter((i) => i !== optionIndex)
          : [...selected, optionIndex]
      );
    } else {
      onChange([optionIndex]);
    }
  };

  return (
    <div data-cy="quiz-question-card">
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
          {label}
        </p>
      )}
      <p className="mb-4 text-base font-semibold text-brand-text-primary">
        {question.question}
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((option, optionIndex) => {
          const isSelected = selected.includes(optionIndex);
          return (
            <label
              key={optionIndex}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors',
                isSelected
                  ? 'border-brand-red bg-red-50 text-brand-text-primary'
                  : 'border-brand-border text-brand-text-primary',
                isInteractive
                  ? 'cursor-pointer hover:bg-brand-hover'
                  : 'cursor-default'
              )}
            >
              <input
                type={isMultiSelect ? 'checkbox' : 'radio'}
                name={`quiz-question-${question.id}`}
                checked={isSelected}
                disabled={!isInteractive}
                onChange={() => toggleOption(optionIndex)}
                className="h-4 w-4 accent-brand-red"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
