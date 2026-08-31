import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { createTechTalk, TechTalkStatus } from '@repo/shared';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockListAll = jest.fn();
const mockPublishTechTalk = jest.fn();
const mockUnpublishTechTalk = jest.fn();
const mockDeleteTechTalk = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@/lib/api/techTalks', () => ({
  listAll: (...args: unknown[]) => mockListAll(...args),
  publishTechTalk: (...args: unknown[]) => mockPublishTechTalk(...args),
  unpublishTechTalk: (...args: unknown[]) => mockUnpublishTechTalk(...args),
  deleteTechTalk: (...args: unknown[]) => mockDeleteTechTalk(...args),
}));

jest.mock('@/lib/hooks/useTechTalks', () => ({
  useAllTechTalks: (query: unknown) => {
    const { useState, useEffect } = jest.requireActual('react') as typeof import('react');
    const [state, setState] = useState({ techTalks: [], total: 0, loading: true, error: null as string | null });
    useEffect(() => {
      mockListAll(query).then(
        (r: { techTalks: unknown[]; total: number }) => setState({ techTalks: r.techTalks as never[], total: r.total, loading: false, error: null }),
        (e: Error) => setState({ techTalks: [], total: 0, loading: false, error: e.message })
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(query)]);
    return { ...state, refetch: mockRefetch };
  },
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

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

const mockShowToast = jest.fn();

jest.mock('@/lib/hooks/useToast', () => ({
  useToast: () => ({
    toast: { visible: false, message: '', type: 'success' as const },
    showToast: mockShowToast,
  }),
}));

import AdminTechTalksPage from '../page';

// The ConfirmationModal uses data-cy (Cypress convention), not data-testid.
function getConfirmButton(): HTMLElement {
  const btn = document.querySelector('[data-cy="confirm-submit-button"]');
  if (!btn) throw new Error('Confirm button not found');
  return btn as HTMLElement;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const draftTalk = createTechTalk({
  id: 'tt-1',
  title: 'Draft Talk',
  description: null,
  presenters: ['Alice'],
  tags: [],
  eventDate: '2026-09-01T10:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: null,
  status: 'draft',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
});

const publishedTalk = createTechTalk({
  id: 'tt-2',
  title: 'Published Talk',
  description: 'A live talk',
  presenters: ['Bob', 'Carol'],
  tags: ['react'],
  eventDate: '2026-10-15T14:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: 'abc123',
  status: 'published',
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
});

const unpublishedTalk = createTechTalk({
  id: 'tt-3',
  title: 'Unpublished Talk',
  description: null,
  presenters: ['Dave'],
  tags: [],
  eventDate: '2026-07-01T09:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: null,
  status: 'unpublished',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z',
});

const emptyResult = { techTalks: [], total: 0, page: 1, limit: 12 };
const sampleResult = {
  techTalks: [draftTalk, publishedTalk, unpublishedTalk],
  total: 3,
  page: 1,
  limit: 12,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AdminTechTalksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAll.mockResolvedValue(sampleResult);
    mockRefetch.mockResolvedValue(undefined);
  });

  it('shows loading state initially', () => {
    mockListAll.mockReturnValue(new Promise(() => {}));
    render(<AdminTechTalksPage />);
    expect(screen.getByTestId('admin-techtalks-loading')).toBeInTheDocument();
  });

  it('shows empty state when no tech talks are returned', async () => {
    mockListAll.mockResolvedValue(emptyResult);
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-techtalks-empty')).toBeInTheDocument()
    );
  });

  it('shows error banner when fetch fails', async () => {
    mockListAll.mockRejectedValue(new Error('Server error'));
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-techtalks-error')).toHaveTextContent(
        'Server error'
      )
    );
  });

  it('renders rows for a mixed-status list with correct titles', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByText('Draft Talk')).toBeInTheDocument()
    );
    expect(screen.getByText('Published Talk')).toBeInTheDocument();
    expect(screen.getByText('Unpublished Talk')).toBeInTheDocument();
  });

  it('renders correct status badges for each status', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getAllByTestId('techtalk-status-badge').length).toBeGreaterThan(0)
    );
    const badges = screen.getAllByTestId('techtalk-status-badge').map((b) => b.textContent);
    expect(badges).toContain(TechTalkStatus.draft);
    expect(badges).toContain(TechTalkStatus.published);
    expect(badges).toContain(TechTalkStatus.unpublished);
  });

  it('renders each row with the correct data-testid', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('techtalk-row-tt-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('techtalk-row-tt-2')).toBeInTheDocument();
    expect(screen.getByTestId('techtalk-row-tt-3')).toBeInTheDocument();
  });

  it('links each row title to the admin detail page', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('techtalk-link-tt-1')).toHaveAttribute(
        'href',
        '/admin/tech-talks/tt-1'
      )
    );
  });

  it('renders correct independent stat-card counts', async () => {
    const statsResult = {
      techTalks: [
        { ...draftTalk, id: '1' },
        { ...publishedTalk, id: '2' },
        { ...publishedTalk, id: '3' },
        { ...unpublishedTalk, id: '4' },
        { ...unpublishedTalk, id: '5' },
        { ...unpublishedTalk, id: '6' },
      ],
      total: 6,
      page: 1,
      limit: 12,
    };
    mockListAll.mockResolvedValue(statsResult);

    render(<AdminTechTalksPage />);

    await waitFor(() =>
      expect(screen.getByTestId('total-techtalks-stat')).toHaveTextContent('6')
    );
    expect(screen.getByTestId('published-techtalks-stat')).toHaveTextContent('2');
    expect(screen.getByTestId('draft-techtalks-stat')).toHaveTextContent('1');
    expect(screen.getByTestId('unpublished-techtalks-stat')).toHaveTextContent('3');
  });

  it('renders presenters joined by comma', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByText('Bob, Carol')).toBeInTheDocument()
    );
  });

  it('Create Tech Talk button links to the correct route', async () => {
    render(<AdminTechTalksPage />);
    const btn = screen.getByTestId('create-techtalk-btn');
    expect(btn).toHaveAttribute('href', '/admin/tech-talks/create');
  });

  it('shows pagination controls when rows are present', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument()
    );
  });

  it('renders status filter select dropdown with all options', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('techtalk-status-filter')).toBeInTheDocument()
    );
    const select = screen.getByTestId('techtalk-status-filter') as HTMLSelectElement;
    expect(select.options.length).toBe(4);
    expect(select.options[0]!.text).toBe('All Statuses');
    expect(select.options[0]!.value).toBe('All');
    expect(select.options[1]!.text).toBe('Draft');
    expect(select.options[1]!.value).toBe('draft');
    expect(select.options[2]!.text).toBe('Published');
    expect(select.options[2]!.value).toBe('published');
    expect(select.options[3]!.text).toBe('Unpublished');
    expect(select.options[3]!.value).toBe('unpublished');
  });

  it('filters by status when a filter is selected, and does not alter stat cards', async () => {
    mockListAll.mockImplementation((query?: unknown) => {
      const q = query as { status?: string } | undefined;
      if (q && q.status === 'draft') {
        return Promise.resolve({
          techTalks: [draftTalk],
          total: 1,
          page: 1,
          limit: 12,
        });
      }
      return Promise.resolve(sampleResult);
    });

    render(<AdminTechTalksPage />);

    await waitFor(() =>
      expect(screen.getByText('Draft Talk')).toBeInTheDocument()
    );
    expect(screen.getByText('Published Talk')).toBeInTheDocument();

    expect(screen.getByTestId('total-techtalks-stat')).toHaveTextContent('3');
    expect(screen.getByTestId('draft-techtalks-stat')).toHaveTextContent('1');
    expect(screen.getByTestId('published-techtalks-stat')).toHaveTextContent('1');
    expect(screen.getByTestId('unpublished-techtalks-stat')).toHaveTextContent('1');

    const select = screen.getByTestId('techtalk-status-filter');
    fireEvent.change(select, { target: { value: 'draft' } });

    // hook must be called with the exact lowercase status value
    await waitFor(() =>
      expect(mockListAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' })
      )
    );

    await waitFor(() =>
      expect(screen.queryByText('Published Talk')).not.toBeInTheDocument()
    );

    expect(screen.getByTestId('total-techtalks-stat')).toHaveTextContent('3');
    expect(screen.getByTestId('draft-techtalks-stat')).toHaveTextContent('1');
    expect(screen.getByTestId('published-techtalks-stat')).toHaveTextContent('1');
    expect(screen.getByTestId('unpublished-techtalks-stat')).toHaveTextContent('1');

    fireEvent.change(select, { target: { value: 'All' } });

    // when reset, status must be omitted / undefined so all entries are returned
    await waitFor(() =>
      expect(mockListAll).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: 'draft' })
      )
    );

    await waitFor(() =>
      expect(screen.getByText('Published Talk')).toBeInTheDocument()
    );
    expect(screen.getByText('Draft Talk')).toBeInTheDocument();

    expect(screen.getByTestId('total-techtalks-stat')).toHaveTextContent('3');
  });
});

// ── Publish / Unpublish Tests ─────────────────────────────────────────────────

describe('AdminTechTalksPage — Publish / Unpublish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAll.mockResolvedValue(sampleResult);
    mockRefetch.mockResolvedValue(undefined);
    mockPublishTechTalk.mockResolvedValue({ ...draftTalk, status: 'published' });
    mockUnpublishTechTalk.mockResolvedValue({ ...publishedTalk, status: 'unpublished' });
  });

  it('renders Publish button for draft tech talks', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('publish-btn-tt-1')).toHaveTextContent('Publish');
  });

  it('renders Unpublish button for published tech talks', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeInTheDocument()
    );
    expect(screen.getByTestId('unpublish-btn-tt-2')).toHaveTextContent('Unpublish');
  });

  it('renders Publish button for unpublished tech talks', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-3')).toBeInTheDocument()
    );
    expect(screen.getByTestId('publish-btn-tt-3')).toHaveTextContent('Publish');
  });

  it('clicking Publish opens the confirmation modal', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Are you sure you want to publish this Tech Talk?')
    ).toBeInTheDocument();
  });

  it('clicking Unpublish opens the confirmation modal', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('unpublish-btn-tt-2'));

    await waitFor(() =>
      expect(screen.getByText('Unpublish Tech Talk?')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Are you sure you want to unpublish this Tech Talk?')
    ).toBeInTheDocument();
  });

  it('clicking Cancel does NOT call the API', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() =>
      expect(screen.queryByText('Publish Tech Talk?')).not.toBeInTheDocument()
    );
    expect(mockPublishTechTalk).not.toHaveBeenCalled();
    expect(mockUnpublishTechTalk).not.toHaveBeenCalled();
  });

  it('confirming Publish calls publishTechTalk with the correct ID', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    const confirmButton = getConfirmButton();
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(mockPublishTechTalk).toHaveBeenCalledWith('tt-1')
    );
  });

  it('confirming Unpublish calls unpublishTechTalk with the correct ID', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('unpublish-btn-tt-2'));

    await waitFor(() =>
      expect(screen.getByText('Unpublish Tech Talk?')).toBeInTheDocument()
    );

    const confirmButton = getConfirmButton();
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(mockUnpublishTechTalk).toHaveBeenCalledWith('tt-2')
    );
  });

  it('successful Publish shows a success toast', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        'Tech Talk published successfully',
        'success'
      )
    );
  });

  it('successful Unpublish shows a success toast', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('unpublish-btn-tt-2'));

    await waitFor(() =>
      expect(screen.getByText('Unpublish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        'Tech Talk unpublished successfully',
        'success'
      )
    );
  });

  it('successful Publish calls refetch to update the list', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockRefetch).toHaveBeenCalled()
    );
  });

  it('successful Unpublish calls refetch to update the list', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('unpublish-btn-tt-2'));

    await waitFor(() =>
      expect(screen.getByText('Unpublish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockRefetch).toHaveBeenCalled()
    );
  });

  it('Publish API failure shows an error toast', async () => {
    mockPublishTechTalk.mockRejectedValue(new Error('404 Tech Talk not found'));

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        '404 Tech Talk not found',
        'error'
      )
    );
  });

  it('Unpublish API failure shows an error toast', async () => {
    mockUnpublishTechTalk.mockRejectedValue(
      new Error('400 Invalid status transition')
    );

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('unpublish-btn-tt-2'));

    await waitFor(() =>
      expect(screen.getByText('Unpublish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        '400 Invalid status transition',
        'error'
      )
    );
  });

  it('confirm button is disabled while the mutation is in progress', async () => {
    let resolvePublish: (value: unknown) => void;
    mockPublishTechTalk.mockImplementation(
      () => new Promise((resolve) => { resolvePublish = resolve; })
    );

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() => {
      const confirmButton = getConfirmButton();
      expect(confirmButton).toBeDisabled();
    });

    resolvePublish!({ ...draftTalk, status: 'published' });

    await waitFor(() =>
      expect(screen.queryByText('Publish Tech Talk?')).not.toBeInTheDocument()
    );
  });

  it('publish action buttons are disabled while another mutation is pending', async () => {
    let resolvePublish: (value: unknown) => void;
    mockPublishTechTalk.mockImplementation(
      () => new Promise((resolve) => { resolvePublish = resolve; })
    );

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() => {
      expect(screen.getByTestId('publish-btn-tt-3')).toBeDisabled();
      expect(screen.getByTestId('unpublish-btn-tt-2')).toBeDisabled();
    });

    resolvePublish!({ ...draftTalk, status: 'published' });

    await waitFor(() =>
      expect(screen.queryByText('Publish Tech Talk?')).not.toBeInTheDocument()
    );
  });

  it('Publish for unpublished talk calls publishTechTalk with the correct ID', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-3')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-3'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockPublishTechTalk).toHaveBeenCalledWith('tt-3')
    );
  });

  it('generic API error shows an error toast', async () => {
    mockPublishTechTalk.mockRejectedValue(new Error('Network error'));

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error')
    );
  });

  it('API failure does not change the list data', async () => {
    mockPublishTechTalk.mockRejectedValue(new Error('Failed'));

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByText('Draft Talk')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('publish-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Publish Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Failed', 'error')
    );

    // The list should still show the original data
    expect(screen.getByText('Draft Talk')).toBeInTheDocument();
    expect(screen.getByTestId('publish-btn-tt-1')).toBeInTheDocument();
  });
});

// ── Edit Tests ────────────────────────────────────────────────────────────────

describe('AdminTechTalksPage — Edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAll.mockResolvedValue(sampleResult);
    mockRefetch.mockResolvedValue(undefined);
  });

  it('renders an Edit link for every row', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('edit-btn-tt-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('edit-btn-tt-2')).toBeInTheDocument();
    expect(screen.getByTestId('edit-btn-tt-3')).toBeInTheDocument();
  });

  it('Edit link points to the correct edit route', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('edit-btn-tt-1')).toHaveAttribute(
        'href',
        '/admin/tech-talks/tt-1/edit'
      )
    );
    expect(screen.getByTestId('edit-btn-tt-2')).toHaveAttribute(
      'href',
      '/admin/tech-talks/tt-2/edit'
    );
    expect(screen.getByTestId('edit-btn-tt-3')).toHaveAttribute(
      'href',
      '/admin/tech-talks/tt-3/edit'
    );
  });
});

// ── Delete Tests ──────────────────────────────────────────────────────────────

describe('AdminTechTalksPage — Delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAll.mockResolvedValue(sampleResult);
    mockRefetch.mockResolvedValue(undefined);
    mockDeleteTechTalk.mockResolvedValue(undefined);
  });

  it('renders a Delete button for every row', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('delete-btn-tt-2')).toBeInTheDocument();
    expect(screen.getByTestId('delete-btn-tt-3')).toBeInTheDocument();
  });

  it('clicking Delete opens the confirmation modal with the correct title and message', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Are you sure you want to delete this Tech Talk? This action cannot be undone.')
    ).toBeInTheDocument();
  });

  it('clicking Cancel in the Delete modal does NOT call deleteTechTalk', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() =>
      expect(screen.queryByText('Delete Tech Talk?')).not.toBeInTheDocument()
    );
    expect(mockDeleteTechTalk).not.toHaveBeenCalled();
  });

  it('confirming Delete calls deleteTechTalk with the correct ID', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockDeleteTechTalk).toHaveBeenCalledWith('tt-1')
    );
  });

  it('successful Delete shows a success toast', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-2')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-2'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        'Tech Talk deleted successfully',
        'success'
      )
    );
  });

  it('successful Delete calls refetch to refresh the list', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockRefetch).toHaveBeenCalled()
    );
  });

  it('Delete API failure shows an error toast', async () => {
    mockDeleteTechTalk.mockRejectedValue(new Error('500 Internal Server Error'));

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        '500 Internal Server Error',
        'error'
      )
    );
  });

  it('Delete API failure does NOT remove the talk from the list', async () => {
    mockDeleteTechTalk.mockRejectedValue(new Error('Failed'));

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByText('Draft Talk')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Failed', 'error')
    );

    // List should still show the original data
    expect(screen.getByText('Draft Talk')).toBeInTheDocument();
    expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument();
  });

  it('delete action buttons are disabled while a mutation is in progress', async () => {
    let resolveDelete: () => void;
    mockDeleteTechTalk.mockImplementation(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; })
    );

    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delete-btn-tt-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('delete-btn-tt-1'));

    await waitFor(() =>
      expect(screen.getByText('Delete Tech Talk?')).toBeInTheDocument()
    );

    fireEvent.click(getConfirmButton());

    await waitFor(() => {
      expect(screen.getByTestId('delete-btn-tt-2')).toBeDisabled();
      expect(screen.getByTestId('delete-btn-tt-3')).toBeDisabled();
    });

    resolveDelete!();

    await waitFor(() =>
      expect(screen.queryByText('Delete Tech Talk?')).not.toBeInTheDocument()
    );
  });
});
