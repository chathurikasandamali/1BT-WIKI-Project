'use client';

//useState is used to store the Tech Talk data, loading state, and error state.
//useEffect is used to fetch the Tech Talk details when the page loads or when the Tech Talk ID changes.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTechTalkById, type TechTalkDetail } from '@/lib/api/techTalks';
import { YoutubeEmbed } from '@/components/techTalks/YoutubeEmbed';
import { formatDate } from '@/lib/utils/date';
import { ArrowLeftIcon } from '@/components/shared/icons/ArrowLeftIcon';

function TechTalkDetailPageContent(): React.JSX.Element {
  const params = useParams();
  const id = (params?.id as string) || '';
  const [techTalk, setTechTalk] = useState<TechTalkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    const loadTechTalk = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getTechTalkById(id, {
          signal: controller.signal,
        });

        setTechTalk(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load Tech Talk');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadTechTalk();

    return () => {
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return (
      <div
        className="max-w-5xl mx-auto p-4 sm:p-6 text-center text-brand-text-secondary"
        data-testid="techtalk-detail-loading"
      >
        Loading Tech Talk details...
      </div>
    );
  }

  const errorMessage = error
    ? error.includes('403')
      ? 'You do not have permission to view this Tech Talk.'
      : error.includes('404')
      ? 'Tech Talk not found.'
      : error
    : null;

  if (errorMessage || !techTalk) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <Link
            href="/tech-talks"
            className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
            data-testid="back-to-list-link"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Tech Talks
          </Link>
        </div>

        <div
          className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
          data-testid="techtalk-detail-error"
        >
          {errorMessage ?? 'Tech Talk not found.'}
        </div>
      </div>
    );
  }

  const presentersLabel = techTalk.presenters.join(', ');
  const hasTags = techTalk.tags.length > 0;
  const formattedEventDate = formatDate(techTalk.eventDate);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6" data-testid="techtalk-detail-page">
      <div className="mb-6">
        <Link
          href="/tech-talks"
          className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
          data-testid="back-to-list-link"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Tech Talks
        </Link>
      </div>

      <article className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="p-6 md:p-8 border-b border-brand-border">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-text-primary leading-tight">
                {techTalk.title}
              </h1>
              <p className="text-sm text-brand-text-secondary">{formattedEventDate}</p>
            </div>

            {techTalk.description ? (
              <p className="text-sm text-brand-text-secondary leading-relaxed">
                {techTalk.description}
              </p>
            ) : null}

            <div className="text-sm text-brand-text-secondary">
              <span className="font-semibold text-brand-text-primary">
                Presenter{techTalk.presenters.length > 1 ? 's' : ''}:
              </span>{' '}
              {presentersLabel}
            </div>

            {hasTags ? (
              <div className="flex flex-wrap gap-2">
                {techTalk.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-brand-bg text-brand-text-secondary text-xs font-semibold uppercase tracking-wider border border-brand-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6 md:p-8 bg-white space-y-6">
          <YoutubeEmbed videoId={techTalk.youtubeVideoId} title={techTalk.title} />

          {techTalk.slidesUrl ? (
            <a
              href={techTalk.slidesUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="techtalk-slides-link"
              className="inline-flex items-center text-sm font-medium text-brand-red hover:text-brand-red-hover transition-colors"
            >
              View Slides
            </a>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export default function TechTalkDetailPage(): React.JSX.Element {
  return <TechTalkDetailPageContent />;
}
