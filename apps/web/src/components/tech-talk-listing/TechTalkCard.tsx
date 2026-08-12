import React from 'react';

interface TechTalkCardProps {
    id: string;
    title: string;
    tags: string[];
    presenters: string[];
    eventDate: string;
}

export function TechTalkCard({
    id,
    title,
    tags,
    presenters,
    eventDate,
}: TechTalkCardProps): React.JSX.Element {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <article
            data-testid={`tech-talk-card-${id}`}
            className="flex flex-col gap-4 p-6 bg-white border border-brand-border rounded-lg"
        >
            <div className="flex flex-col gap-2 flex-grow">
                <span className="w-fit px-2 py-1 text-xs font-medium text-brand-red bg-red-50 rounded-full">
                    Tech Talk
                </span>

                <h2 className="text-xl font-semibold text-brand-text-primary line-clamp-2">
                    {title}
                </h2>

                <p className="text-sm text-brand-text-secondary">
                    Presented by {presenters.join(', ')}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-end mt-4 text-sm text-brand-text-secondary">
                <span>{formattedDate}</span>
            </div>
        </article>
    );
}