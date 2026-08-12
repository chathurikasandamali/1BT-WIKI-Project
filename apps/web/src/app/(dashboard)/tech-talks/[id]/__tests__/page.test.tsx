import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TechTalkDetailPage from '../page';
import { getTechTalkById } from '@/lib/api/techTalks';
import { useParams } from 'next/navigation';

jest.mock('@/lib/api/techTalks', () => ({
  getTechTalkById: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

const mockGetTechTalkById = getTechTalkById as jest.Mock;
const mockUseParams = useParams as jest.Mock;

const mockTechTalk = {
  id: 'talk-1',
  title: 'Advanced Agentic Coding',
  description: 'A deep dive into generative UX patterns.',
  presenters: ['Alice', 'Bob'],
  tags: ['AI', 'UX'],
  eventDate: '2026-08-11T12:00:00.000Z',
  slidesUrl: 'https://example.com/slides.pdf',
  youtubeVideoId: 'dQw4w9WgXcQ',
  status: 'published',
  createdBy: 'admin',
  deletedAt: null,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-02T12:00:00.000Z',
};

describe('TechTalkDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: mockTechTalk.id });
  });

  it('renders loading state initially', () => {
    mockGetTechTalkById.mockImplementation(
      () => new Promise(() => {})
    );

    render(<TechTalkDetailPage />);

    expect(screen.getByTestId('techtalk-detail-loading')).toBeInTheDocument();
  });

  it('renders 403 permission error state', async () => {
    mockGetTechTalkById.mockRejectedValue(new Error('403 Forbidden'));

    render(<TechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('techtalk-detail-error')).toBeInTheDocument();
    });

    expect(screen.getByText('You do not have permission to view this Tech Talk.')).toBeInTheDocument();
  });

  it('renders 404 not found error state', async () => {
    mockGetTechTalkById.mockRejectedValue(new Error('404 Not Found'));

    render(<TechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('techtalk-detail-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Tech Talk not found.')).toBeInTheDocument();
  });

  it('renders tech talk details and slides link when slidesUrl is present', async () => {
    mockGetTechTalkById.mockResolvedValue(mockTechTalk);

    render(<TechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('techtalk-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(mockTechTalk.title)).toBeInTheDocument();
    expect(screen.getByText(mockTechTalk.description)).toBeInTheDocument();
    expect(screen.getByText(/Presenter.*:/)).toBeInTheDocument();
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('UX')).toBeInTheDocument();
    expect(screen.getByText('11 Aug 2026')).toBeInTheDocument();

    const slidesLink = screen.getByTestId('techtalk-slides-link');
    expect(slidesLink).toHaveAttribute('href', mockTechTalk.slidesUrl);

    const iframe = screen.getByTestId('techtalk-video-embed');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('omits the slides link when slidesUrl is null', async () => {
    mockGetTechTalkById.mockResolvedValue({
      ...mockTechTalk,
      slidesUrl: null,
    });

    render(<TechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('techtalk-detail-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('techtalk-slides-link')).not.toBeInTheDocument();
  });
});
