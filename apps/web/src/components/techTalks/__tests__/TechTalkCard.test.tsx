import React from 'react';
import { render, screen } from '@testing-library/react';
import { TechTalkCard } from '../TechTalkCard';
import { type TechTalkListItem } from '@/lib/api/techTalks';

const mockTechTalk: TechTalkListItem = {
    id: 'talk-1',
    title: 'Advanced Agentic Coding',
    description: 'A deep dive into building AI agents that write software autonomously.',
    presenters: ['Antigravity', 'Gemini Team'],
    tags: ['AI', 'Agentic Coding', 'Deepmind'],
    eventDate: '2026-08-11T10:00:00.000Z',
    slidesUrl: null,
    youtubeVideoId: null,
    status: 'published',
    createdAt: '2026-08-11T09:00:00.000Z',
    updatedAt: '2026-08-11T10:00:00.000Z',
};

describe('TechTalkCard', () => {
    it('renders title, presenters, formatted date, description and tags', () => {
        render(<TechTalkCard techTalk={mockTechTalk} />);

        // Title
        expect(screen.getByText('Advanced Agentic Coding')).toBeInTheDocument();

        // Presenters
        expect(screen.getByText('Antigravity, Gemini Team')).toBeInTheDocument();

        // Formatted Date
        expect(screen.getByText('11 Aug 2026')).toBeInTheDocument();

        // Description
        expect(screen.getByText('A deep dive into building AI agents that write software autonomously.')).toBeInTheDocument();

        // Tags
        expect(screen.getByText('AI')).toBeInTheDocument();
        expect(screen.getByText('Agentic Coding')).toBeInTheDocument();
        expect(screen.getByText('Deepmind')).toBeInTheDocument();

        // Link
        const link = screen.getByRole('link', { name: 'View Details →' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/tech-talks/talk-1');
    });

    it('renders correctly when description and tags are missing or empty', () => {
        const minimalTalk: TechTalkListItem = {
            ...mockTechTalk,
            description: null,
            tags: [],
        };

        render(<TechTalkCard techTalk={minimalTalk} />);

        expect(screen.getByText('Advanced Agentic Coding')).toBeInTheDocument();
        expect(screen.queryByText('A deep dive into building AI agents that write software autonomously.')).not.toBeInTheDocument();
        expect(screen.queryByText('AI')).not.toBeInTheDocument();
    });
});
