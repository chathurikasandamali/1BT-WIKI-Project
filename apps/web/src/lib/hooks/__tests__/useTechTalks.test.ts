import { renderHook, waitFor, act } from '@testing-library/react';
import { usePublishedTechTalks } from '../useTechTalks';
import { listPublished } from '@/lib/api/techTalks';

jest.mock('@/lib/api/techTalks', () => ({
  listPublished: jest.fn(),
}));

const mockListPublished = listPublished as jest.Mock;

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
    mockListPublished.mockResolvedValue(MOCK_PAGE);

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.techTalks).toEqual([MOCK_TALK]);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  // ─── 2 & 3 ────────────────────────────────────────────────────────────────
  it('passes page, limit, search, sort and order to listPublished', async () => {
    mockListPublished.mockResolvedValue({
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
    expect(mockListPublished).toHaveBeenCalledWith(
      2,
      10,
      'react',
      'eventDate',
      'desc'
    );
  });

  // ─── 6 ────────────────────────────────────────────────────────────────────
  it('starts in loading state and clears it after the fetch resolves', async () => {
    mockListPublished.mockResolvedValue(MOCK_PAGE);

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  // ─── 7 ────────────────────────────────────────────────────────────────────
  it('stores API errors in the error field', async () => {
    mockListPublished.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.techTalks).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  // ─── 8 ────────────────────────────────────────────────────────────────────
  it('refetch() calls the same fetch implementation and refreshes data', async () => {
    mockListPublished.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { result } = renderHook(() => usePublishedTechTalks(1, 20));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // New data available on the next call
    mockListPublished.mockResolvedValue(MOCK_PAGE);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.techTalks).toEqual([MOCK_TALK]);
    expect(result.current.total).toBe(1);
    // At least two calls: initial + refetch
    expect(mockListPublished.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // ─── 9 ────────────────────────────────────────────────────────────────────
  it('re-fetches when page changes', async () => {
    mockListPublished.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ page }: { page: number }) => usePublishedTechTalks(page, 20),
      { initialProps: { page: 1 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListPublished).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined);

    mockListPublished.mockClear();

    rerender({ page: 2 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListPublished).toHaveBeenCalledWith(2, 20, undefined, undefined, undefined);
  });

  it('re-fetches when limit changes', async () => {
    mockListPublished.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ limit }: { limit: number }) => usePublishedTechTalks(1, limit),
      { initialProps: { limit: 20 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockListPublished.mockClear();

    rerender({ limit: 10 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListPublished).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined);
  });

  it('re-fetches when search changes', async () => {
    mockListPublished.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ search }: { search?: string }) => usePublishedTechTalks(1, 20, search),
        { initialProps: { search: undefined } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockListPublished.mockClear();

    rerender({ search: 'React' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListPublished).toHaveBeenCalledWith(1, 20, 'React', undefined, undefined);
  });

  it('re-fetches when sort changes', async () => {
    mockListPublished.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ sort }: { sort?: string }) => usePublishedTechTalks(1, 20, undefined, sort),
      { initialProps: { sort: 'eventDate' } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockListPublished.mockClear();

    rerender({ sort: 'title' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListPublished).toHaveBeenCalledWith(1, 20, undefined, 'title', undefined);
  });

  it('re-fetches when order changes', async () => {
    mockListPublished.mockResolvedValue({ techTalks: [], total: 0, page: 1, limit: 20 });

    const { rerender, result } = renderHook(
      ({ order }: { order?: string }) =>
        usePublishedTechTalks(1, 20, undefined, 'eventDate', order),
      { initialProps: { order: 'desc' } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockListPublished.mockClear();

    rerender({ order: 'asc' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListPublished).toHaveBeenCalledWith(1, 20, undefined, 'eventDate', 'asc');
  });
});
