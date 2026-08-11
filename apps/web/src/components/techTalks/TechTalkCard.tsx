import React from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { type TechTalkListItem } from '@/lib/api/techTalks';

interface TechTalkCardProps {
    techTalk: TechTalkListItem;
}

export const TechTalkCard: React.FC<TechTalkCardProps> = ({ techTalk }) => {
    const formattedDate = formatDate(techTalk.eventDate);
    const presentersLabel = techTalk.presenters.join(', ');
    const hasTags = techTalk.tags && techTalk.tags.length > 0;

    return (
        <div
            data-testid={`techtalk-card-${techTalk.id}`}
            className="flex flex-col justify-between p-5 bg-brand-surface border border-brand-border rounded hover:border-brand-text-secondary hover:shadow-sm transition-all"
        >
            <div className="min-w-0">
                <div className="text-xs text-brand-text-secondary mb-2 font-medium">
                    {formattedDate}
                </div>
                <h3 className="text-lg font-bold text-brand-text-primary mb-1 line-clamp-2">
                    {techTalk.title}
                </h3>
                <p className="text-sm text-brand-text-secondary mb-4">
                    Presenter{techTalk.presenters.length > 1 ? 's' : ''}:{' '}
                    <span className="font-semibold text-brand-text-primary">
                        {presentersLabel}
                    </span>
                </p>
                {techTalk.description && (
                    <p className="text-sm text-brand-text-secondary line-clamp-3 mb-4 leading-relaxed">
                        {techTalk.description}
                    </p>
                )}
            </div>

            <div>
                {hasTags && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                        {techTalk.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-hover text-brand-text-primary border border-brand-border"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <Link
                    href={`/tech-talks/${techTalk.id}`}
                    className="inline-flex items-center text-xs font-bold text-brand-red hover:text-brand-red-hover transition-colors"
                >
                    View Details →
                </Link>
            </div>
        </div>
    );
};
