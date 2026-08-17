'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X } from 'lucide-react';
import {
  generateQuiz,
  submitQuiz,
  type QuizQuestionPublic,
  type QuizSubmitResponse,
} from '@/lib/api/articles';
import { SpinnerIcon } from '@/components/shared/icons/SpinnerIcon';
import { QuizProgressBar } from '@/components/quiz/QuizProgressBar';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';
import { QuizResultScreen } from '@/components/quiz/QuizResultScreen';

interface ReaderQuizModalProps {
  isOpen: boolean;
  articleId: string | null;
  onClose: () => void;
}

type Step =
  | 'loading'
  | 'error'
  | 'answering'
  | 'preview'
  | 'confirm'
  | 'submitting'
  | 'result';

export function ReaderQuizModal({
  isOpen,
  articleId,
  onClose,
}: ReaderQuizModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionPublic[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitResult, setSubmitResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !articleId) return;

    let cancelled = false;
    setStep('loading');
    setError(null);
    setQuizId(null);
    setQuestions([]);
    setQuestionIndex(0);
    setAnswers({});
    setSubmitResult(null);

    generateQuiz(articleId)
      .then((quiz) => {
        if (cancelled) return;
        if (quiz.questions.length === 0) {
          setError('This quiz has no questions yet.');
          setStep('error');
          return;
        }
        setQuizId(quiz.quizId);
        setQuestions(quiz.questions);
        setStep('answering');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to generate quiz');
        setStep('error');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, articleId]);

  useGSAP(() => {
    if (!mounted || !overlayRef.current || !modalRef.current) return;

    if (isOpen) {
      gsap.to(overlayRef.current, {
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.3,
      });
      gsap.fromTo(
        modalRef.current,
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
      );
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.3,
      });
      gsap.to(modalRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
  }, [isOpen, mounted]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('loading');
      setError(null);
      setQuizId(null);
      setQuestions([]);
      setQuestionIndex(0);
      setAnswers({});
      setSubmitResult(null);
    }, 300);
  };

  const currentQuestion = questions[questionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? [] : [];

  const handleAnswerChange = (selected: number[]) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: selected }));
  };

  const handleNext = () => {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((i) => i + 1);
    } else {
      setStep('preview');
    }
  };

  const handlePrevious = () => {
    setQuestionIndex((i) => Math.max(0, i - 1));
  };

  const handleEditAnswer = (index: number) => {
    setQuestionIndex(index);
    setStep('answering');
  };

  const handleConfirmSubmit = () => {
    if (!articleId || !quizId) return;
    setStep('submitting');
    submitQuiz(articleId, quizId, answers)
      .then((result) => {
        setSubmitResult(result);
        setStep('result');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to submit quiz');
        setStep('error');
      });
  };

  let footer: React.ReactNode;
  if (step === 'answering') {
    footer = (
      <>
        <button
          type="button"
          onClick={handlePrevious}
          disabled={questionIndex === 0}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          data-cy="quiz-next-button"
          onClick={handleNext}
          disabled={currentAnswer.length === 0}
          className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover disabled:bg-brand-red-disabled transition-colors"
        >
          {questionIndex + 1 < questions.length ? 'Next' : 'Review answers'}
        </button>
      </>
    );
  } else if (step === 'preview') {
    footer = (
      <>
        <button
          type="button"
          onClick={() => handleEditAnswer(questions.length - 1)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          data-cy="quiz-submit-button"
          onClick={() => setStep('confirm')}
          className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover transition-colors"
        >
          Submit
        </button>
      </>
    );
  } else if (step === 'confirm') {
    footer = (
      <>
        <button
          type="button"
          onClick={() => setStep('preview')}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          data-cy="quiz-confirm-submit-button"
          onClick={handleConfirmSubmit}
          className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover transition-colors"
        >
          Confirm submit
        </button>
      </>
    );
  } else {
    footer = (
      <button
        type="button"
        onClick={handleClose}
        className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors"
      >
        Close
      </button>
    );
  }

  if (!mounted) return null;

  let title = 'Article Quiz';
  if (step === 'preview') {
    title = 'Review your answers';
  } else if (step === 'confirm') {
    title = 'Confirm submission';
  } else if (step === 'submitting') {
    title = 'Submitting quiz';
  } else if (step === 'result') {
    title = 'Your results';
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm opacity-0 pointer-events-none"
    >
      <div
        ref={modalRef}
        data-cy="reader-quiz-modal"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 className="text-lg font-bold text-brand-text-primary font-display">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-brand-text-secondary">
              <SpinnerIcon className="h-6 w-6 animate-spin text-brand-red" />
              <p className="text-sm">Generating quiz...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red">
              {error}
            </div>
          )}

          {step === 'answering' && currentQuestion && (
            <div className="flex flex-col gap-5">
              <QuizProgressBar
                current={questionIndex + 1}
                total={questions.length}
              />
              <QuizQuestionCard
                question={currentQuestion}
                selected={currentAnswer}
                onChange={handleAnswerChange}
              />
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col gap-6">
              {questions.map((question, index) => (
                <div key={question.id}>
                  <QuizQuestionCard
                    question={question}
                    selected={answers[question.id] ?? []}
                    label={`Question ${index + 1} of ${questions.length}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleEditAnswer(index)}
                    className="mt-2 text-xs font-semibold text-brand-red hover:underline"
                  >
                    Change answer
                  </button>
                </div>
              ))}
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm font-semibold text-brand-text-primary">
                Submit your answers?
              </p>
              <p className="text-sm text-brand-text-secondary">
                You won&apos;t be able to change your answers after this.
              </p>
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-brand-text-secondary">
              <SpinnerIcon className="h-6 w-6 animate-spin text-brand-red" />
              <p className="text-sm">Grading your quiz...</p>
            </div>
          )}

          {step === 'result' && submitResult && (
            <QuizResultScreen result={submitResult} />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-brand-border bg-gray-50 px-6 py-4">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
}
