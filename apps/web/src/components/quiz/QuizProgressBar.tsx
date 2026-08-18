'use client';

interface QuizProgressBarProps {
  current: number;
  total: number;
}

export function QuizProgressBar({ current, total }: QuizProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div data-cy="quiz-progress-bar">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-brand-text-secondary">
        <span>
          Question {Math.min(current, total)} of {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-bg">
        <div
          className="h-full rounded-full bg-brand-red transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
