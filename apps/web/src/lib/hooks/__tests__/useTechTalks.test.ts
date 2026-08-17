import { renderHook, waitFor, act } from '@testing-library/react';
import { usePublishedTechTalks, useAllTechTalks } from '../useTechTalks';
import { fetchPublishedTechTalks, listAll } from '@/lib/api/techTalks';

jest.mock('@/lib/api/techTalks', () => ({
  fetchPublishedTechTalks: jest.fn(),
  listAll: jest.fn(),
}));

const mockFetchPublishedTechTalks = fetchPublishedTechTalks as jest.Mock;
const mockListAll = listAll as jest.Mock;

const MOCK_TALK = {
  id: 'talk-1',
  title: 'Title 1',
  description: 'Desc 1',
  presenters: ['Pres 1'],
  tags: ['Tag 1'],
  eventDate: '2026-08-11T10:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: null,
  status: 'published' as const,
  createdAt: '2026-08-11T09:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
};

const MOCK_PAGE = {
  techTalks: [MOCK_TALK],
  total: 1,
  page: 1,
  limit: 20,
};

describe('usePublishedTechTalks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1 & 4 & 5 ────────────────────────────────────────────────────────────
  it('fetches published tech talks on initial render and populates techTalks + total', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue(MOCK_PAGE);

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.techTalks).toEqual([MOCK_TALK]);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  // ─── 2 & 3 ────────────────────────────────────────────────────────────────
  it('passes page, limit, search, sort and order to fetchPublishedTechTalks', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({
      techTalks: [],
      total: 0,
      page: 2,
      limit: 10,
    });

    const { result } = renderHook(() =>
      usePublishedTechTalks(2, 10, 'react', 'eventDate', 'desc')
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // At least one call must match the exact signature
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'react',
      sort: 'eventDate',
      order: 'desc'
    });
  });

  // ─── 6 ────────────────────────────────────────────────────────────────────
  it('starts in loading state and clears it after the fetch resolves', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue(MOCK_PAGE);

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  // ─── 7 ────────────────────────────────────────────────────────────────────
  it('stores API errors in the error field', async () => {
    mockFetchPublishedTechTalks.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.techTalks).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  // ─── 8 ────────────────────────────────────────────────────────────────────
  it('refetch() calls the same fetch implementation and refreshes data', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // New data available on the next call
    mockFetchPublishedTechTalks.mockResolvedValue(MOCK_PAGE);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.techTalks).toEqual([MOCK_TALK]);
    expect(result.current.total).toBe(1);
    // At least two calls: initial + refetch
    expect(mockFetchPublishedTechTalks.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // ─── 9 ────────────────────────────────────────────────────────────────────
  it('re-fetches when page changes', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ page }: { page: number }) => usePublishedTechTalks(page, 20),
      { initialProps: { page: 1 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({ page: 1, limit: 20, search: undefined, sort: undefined, order: undefined });

    mockFetchPublishedTechTalks.mockClear();

    rerender({ page: 2 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({ page: 2, limit: 20, search: undefined, sort: undefined, order: undefined });
  });

  it('re-fetches when limit changes', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ limit }: { limit: number }) => usePublishedTechTalks(1, limit),
      { initialProps: { limit: 20 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchPublishedTechTalks.mockClear();

    rerender({ limit: 10 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({ page: 1, limit: 10, search: undefined, sort: undefined, order: undefined });
  });

  it('re-fetches when search changes', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ search }: { search?: string }) => usePublishedTechTalks(1, 20, search),
      { initialProps: { search: undefined as string | undefined } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchPublishedTechTalks.mockClear();

    rerender({ search: 'React' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'React', sort: undefined, order: undefined });
  });

  it('re-fetches when sort changes', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ sort }: { sort?: string }) => usePublishedTechTalks(1, 20, undefined, sort),
      { initialProps: { sort: 'eventDate' } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchPublishedTechTalks.mockClear();

    rerender({ sort: 'title' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({ page: 1, limit: 20, search: undefined, sort: 'title', order: undefined });
  });

  it('re-fetches when order changes', async () => {
    mockFetchPublishedTechTalks.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ order }: { order?: string }) =>
        usePublishedTechTalks(1, 20, undefined, 'eventDate', order),
      { initialProps: { order: 'desc' } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchPublishedTechTalks.mockClear();

    rerender({ order: 'asc' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchPublishedTechTalks).toHaveBeenCalledWith({ page: 1, limit: 20, search: undefined, sort: 'eventDate', order: 'asc' });
  });
});

// ── useAllTechTalks ───────────────────────────────────────────────────────────

const MOCK_ALL_TALK = {
  id: 'tt-admin-1',
  title: 'Admin Talk',
  description: null,
  presenters: ['Admin User'],
  tags: [],
  eventDate: '2026-09-01T10:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: null,
  status: 'draft' as const,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const MOCK_ALL_PAGE = {
  techTalks: [MOCK_ALL_TALK],
  total: 1,
  page: 1,
  limit: 12,
};

describe('useAllTechTalks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls listAll and populates techTalks + total on mount', async () => {
    mockListAll.mockResolvedValue(MOCK_ALL_PAGE);

    const { result } = renderHook(() => useAllTechTalks({ page: 1, limit: 12 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.techTalks).toEqual([MOCK_ALL_TALK]);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('starts in loading state and clears it after fetch resolves', async () => {
    mockListAll.mockResolvedValue(MOCK_ALL_PAGE);

    const { result } = renderHook(() => useAllTechTalks());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('stores API errors in the error field', async () => {
    mockListAll.mockRejectedValue(new Error('Admin fetch failed'));

    const { result } = renderHook(() => useAllTechTalks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Admin fetch failed');
    expect(result.current.techTalks).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('passes query params to listAll', async () => {
    mockListAll.mockResolvedValue(MOCK_ALL_PAGE);

    const { result } = renderHook(() =>
      useAllTechTalks({ page: 2, limit: 12, search: 'react' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 12, search: 'react' })
    );
  });

  it('refetch() re-calls listAll and refreshes data', async () => {
    mockListAll.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 12 });

    const { result } = renderHook(() => useAllTechTalks({ page: 1, limit: 12 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockListAll.mockResolvedValue(MOCK_ALL_PAGE);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.techTalks).toEqual([MOCK_ALL_TALK]);
    expect(result.current.total).toBe(1);
    expect(mockListAll.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
