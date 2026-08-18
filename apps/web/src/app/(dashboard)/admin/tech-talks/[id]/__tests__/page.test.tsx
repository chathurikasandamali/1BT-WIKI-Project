import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createTechTalk } from '@repo/shared';
import AdminTechTalkDetailPage from '../page';
import { getTechTalkById } from '@/lib/api/techTalks';
import { useParams } from 'next/navigation';

jest.mock('@/lib/api/techTalks', () => ({
  getTechTalkById: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

jest.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockGetTechTalkById = getTechTalkById as jest.Mock;
const mockUseParams = useParams as jest.Mock;

const mockTechTalk = createTechTalk({
  id: 'talk-123',
  title: 'Admin Preview Talk',
  description: 'An admin-only description.',
  presenters: ['Alice Admin', 'Bob Admin'],
  tags: ['Admin', 'Security'],
  eventDate: '2026-08-11T12:00:00.000Z',
  slidesUrl: 'https://example.com/admin-slides.pdf',
  youtubeVideoId: 'dQw4w9WgXcQ',
  createdBy: 'admin',
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-02T12:00:00.000Z',
});

describe('AdminTechTalkDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: mockTechTalk.id });
  });

  it('renders loading state initially', () => {
    mockGetTechTalkById.mockImplementation(
      () => new Promise(() => {})
    );

    render(<AdminTechTalkDetailPage />);

    expect(screen.getByTestId('admin-techtalk-detail-loading')).toBeInTheDocument();
  });

  it('renders 403 permission error state', async () => {
    mockGetTechTalkById.mockRejectedValue(new Error('403 Forbidden'));

    render(<AdminTechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-techtalk-detail-error')).toBeInTheDocument();
    });

    expect(screen.getByText('You do not have permission to view this Tech Talk.')).toBeInTheDocument();
  });

  it('renders 404 not found error state', async () => {
    mockGetTechTalkById.mockRejectedValue(new Error('404 Not Found'));

    render(<AdminTechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-techtalk-detail-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Tech Talk not found.')).toBeInTheDocument();
  });

  it('renders details correctly for a draft tech talk (admin bypass view)', async () => {
    mockGetTechTalkById.mockResolvedValue({
      ...mockTechTalk,
      status: 'draft',
    });

    render(<AdminTechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-techtalk-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(mockTechTalk.title)).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('Alice Admin, Bob Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('11 Aug 2026')).toBeInTheDocument();

    const backLink = screen.getByTestId('back-to-admin-list-link');
    expect(backLink).toHaveAttribute('href', '/admin/tech-talks');
  });

  it('renders details correctly for an unpublished tech talk', async () => {
    mockGetTechTalkById.mockResolvedValue({
      ...mockTechTalk,
      status: 'unpublished',
    });

    render(<AdminTechTalkDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-techtalk-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(mockTechTalk.title)).toBeInTheDocument();
    expect(screen.getByText('unpublished')).toBeInTheDocument();
  });
});