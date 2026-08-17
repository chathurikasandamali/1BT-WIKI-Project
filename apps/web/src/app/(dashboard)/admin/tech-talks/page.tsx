'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  listAll,
  publishTechTalk,
  unpublishTechTalk,
  type AdminTechTalkListQuery,
} from '@/lib/api/techTalks';
import { useAllTechTalks } from '@/lib/hooks/useTechTalks';
import { useToast } from '@/lib/hooks/useToast';
import { Toast } from '@/components/shared/Toast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TechTalkStatus } from '@repo/db';

import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { ChevronUpIcon } from '@/components/shared/icons/ChevronUpIcon';

gsap.registerPlugin(useGSAP);

// -- Internal types -----------------------------------------------------------

type SortField = 'title' | 'eventDate';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 12;

// -- Helpers ------------------------------------------------------------------

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <ChevronUpIcon
      className={cn(
        'w-3.5 h-3.5 transition-transform',
        active ? 'text-brand-red' : 'text-brand-text-secondary/40',
        active && dir === 'desc' && 'rotate-180'
      )}
    />
  );
}

/**
 * Inline status badge for Tech Talk statuses (lowercase: draft/published/unpublished).
 * Kept as a local component because TechTalkStatus values are lowercase and
 * differ from ArticleStatus, so the shared StatusBadge does not apply directly.
 */
function TechTalkStatusBadge({ status }: { status: TechTalkStatus }): React.JSX.Element {
  const classMap: Record<TechTalkStatus, string> = {
    draft: 'bg-brand-bg text-brand-text-secondary border-brand-border',
    published: 'bg-green-50 text-green-700 border-green-200',
    unpublished: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  };
  const labelMap: Record<TechTalkStatus, string> = {
    draft: TechTalkStatus.draft,
    published: TechTalkStatus.published,
    unpublished: TechTalkStatus.unpublished,
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
        classMap[status]
      )}
      data-testid="techtalk-status-badge"
    >
      {labelMap[status]}
    </span>
  );
}

// -- Main page content --------------------------------------------------------

function TechTalkManagementContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter / sort / pagination state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // Debounce search so we do not refetch on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const query: Omit<AdminTechTalkListQuery, 'status'> = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sort: sortField,
    order: sortDir,
  };

  const { techTalks, total, loading, error, refetch } = useAllTechTalks(query);

  // Summary stat counts (fetched once, independently of filtered list)
  const [statusCounts, setStatusCounts] = useState<Record<
    'all' | TechTalkStatus,
    number
  > | null>(null);

  const loadStatusCounts = useCallback(async () => {
    try {
      const result = await listAll({ page: 1, limit: 10000 });
      const talks = result.techTalks;
      setStatusCounts({
        all: result.total,
        published: talks.filter((t) => t.status === TechTalkStatus.published).length,
        draft: talks.filter((t) => t.status === TechTalkStatus.draft).length,
        unpublished: talks.filter((t) => t.status === TechTalkStatus.unpublished).length,
      });
    } catch {
      // Non-blocking — the table still works without summary tiles.
      setStatusCounts(null);
    }
  }, []);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  // GSAP entrance animation
  useGSAP(
    () => {
      if (!loading && !error && containerRef.current) {
        gsap.fromTo(
          '.page-header',
          { y: -10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
        gsap.fromTo(
          '.table-card',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.08 }
        );
        gsap.fromTo(
          '.techtalk-row',
          { x: -8, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            stagger: 0.04,
            ease: 'power2.out',
            delay: 0.18,
          }
        );
      }
    },
    { scope: containerRef, dependencies: [loading, error] }
  );

  // Sorting
  const toggleSort = (field: SortField) => {
    setPage(1);
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const showSummaryStats = !loading && !error && !!statusCounts;

  // ── Publish / Unpublish state ────────────────────────────────────────────────

  type PublishAction =
  | typeof TechTalkStatus.published
  | typeof TechTalkStatus.unpublished;

  const [selectedTechTalkId, setSelectedTechTalkId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<PublishAction | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const { toast, showToast } = useToast();

  const handleOpenPublishModal = (id: string) => {
    setSelectedTechTalkId(id);
    setSelectedAction(TechTalkStatus.published);
  };

  const handleOpenUnpublishModal = (id: string) => {
    setSelectedTechTalkId(id);
    setSelectedAction(TechTalkStatus.unpublished);
  };

  const handleModalCancel = () => {
    if (isMutating) return;
    setSelectedTechTalkId(null);
    setSelectedAction(null);
  };

  const handleModalConfirm = async () => {
    if (!selectedTechTalkId || !selectedAction || isMutating) return;

    setIsMutating(true);

    try {
      if (selectedAction === TechTalkStatus.published) {
        await publishTechTalk(selectedTechTalkId);
        showToast('Tech Talk published successfully', 'success');
      } else {
        await unpublishTechTalk(selectedTechTalkId);
        showToast('Tech Talk unpublished successfully', 'success');
      }

      setSelectedTechTalkId(null);
      setSelectedAction(null);
      await refetch();
      await loadStatusCounts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      showToast(message, 'error');
      setSelectedTechTalkId(null);
      setSelectedAction(null);
    } finally {
      setIsMutating(false);
    }
  };

  const getModalTitle = (): string => {
    if (selectedAction === TechTalkStatus.published) return 'Publish Tech Talk?';
    if (selectedAction === TechTalkStatus.unpublished) return 'Unpublish Tech Talk?';
    return '';
  };

  const getModalMessage = (): string => {
    if (selectedAction === TechTalkStatus.published)
      return 'Are you sure you want to publish this Tech Talk?';
    if (selectedAction === TechTalkStatus.unpublished)
      return 'Are you sure you want to unpublish this Tech Talk?';
    return '';
  };

  const getModalConfirmText = (): string => {
    if (selectedAction === TechTalkStatus.published) return 'Publish';
    if (selectedAction === TechTalkStatus.unpublished) return 'Unpublish';
    return 'Confirm';
  };

  // Render
  return (
    <>
    <div className="p-8 max-w-6xl mx-auto" ref={containerRef}>
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            Tech Talk Management
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Browse and inspect Tech Talks across every status.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/admin/tech-talks/create"
            data-testid="create-techtalk-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-red text-white hover:bg-brand-red-hover rounded transition-colors"
          >
            + Create Tech Talk
          </Link>
          <button
            type="button"
            onClick={async () => {
              await refetch();
              await loadStatusCounts();
            }}
            data-testid="refresh-btn"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-brand-border text-brand-text-secondary hover:bg-brand-hover rounded transition-colors disabled:opacity-50"
          >
            <RefreshIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary stat cards — matching Article Management's pattern */}
      {showSummaryStats && (
        <div className="page-header grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Tech Talks',
              value: statusCounts!.all,
              color: 'text-brand-text-primary',
              testId: 'total-techtalks-stat',
            },
            {
              label: 'Published',
              value: statusCounts!.published,
              color: 'text-green-600',
              testId: 'published-techtalks-stat',
            },
            {
              label: 'Draft',
              value: statusCounts!.draft,
              color: 'text-amber-600',
              testId: 'draft-techtalks-stat',
            },
            {
              label: 'Unpublished',
              value: statusCounts!.unpublished,
              color: 'text-brand-red',
              testId: 'unpublished-techtalks-stat',
            },
          ].map(({ label, value, color, testId }) => (
            <div
              key={label}
              className="bg-brand-surface border border-brand-border rounded shadow-sm px-4 py-3"
            >
              <p className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className={cn('text-2xl font-bold', color)} data-testid={testId}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm flex items-center justify-between"
          data-testid="admin-techtalks-error"
        >
          <span>{error}</span>
          <button
            onClick={() => refetch()}
            className="ml-4 underline text-brand-red hover:text-brand-red-hover text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="table-card bg-brand-surface border border-brand-border rounded shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-brand-border flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-brand-bg/40">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-4 h-4 text-brand-text-secondary" />
            </span>
            <input
              type="search"
              placeholder="Search by title…"
              data-testid="techtalk-search-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-brand-surface border border-brand-border rounded focus:outline-none focus:border-brand-red transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort controls */}
            <div className="flex items-center gap-1 border border-brand-border rounded overflow-hidden bg-brand-surface">
              {(['title', 'eventDate'] as SortField[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleSort(f)}
                  data-testid={`sort-btn-${f}`}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors capitalize',
                    sortField === f
                      ? 'bg-brand-red/8 text-brand-red'
                      : 'text-brand-text-secondary hover:bg-brand-bg'
                  )}
                >
                  {f === 'eventDate' ? 'Date' : f}
                  <SortIcon active={sortField === f} dir={sortDir} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div
            className="py-20 flex flex-col items-center justify-center gap-3"
            data-testid="admin-techtalks-loading"
          >
            <div className="w-6 h-6 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
            <p className="text-sm text-brand-text-secondary">
              Loading Tech Talks…
            </p>
          </div>
        ) : techTalks.length === 0 ? (
          <div
            className="py-20 text-center text-sm text-brand-text-secondary"
            data-testid="admin-techtalks-empty"
          >
            No Tech Talks found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-brand-text-secondary border-b border-brand-border bg-brand-bg/40">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Presenters</th>
                    <th className="px-4 py-3 font-medium">Event Date</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {techTalks.map((tt) => (
                    <tr
                      key={tt.id}
                      className="techtalk-row border-b border-brand-border last:border-b-0 hover:bg-brand-hover transition-colors"
                      data-testid={`techtalk-row-${tt.id}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/tech-talks/${tt.id}`}
                          className="font-medium text-brand-text-primary hover:text-brand-red transition-colors"
                          data-testid={`techtalk-link-${tt.id}`}
                        >
                          {tt.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <TechTalkStatusBadge status={tt.status} />
                      </td>
                      <td className="px-4 py-3 text-brand-text-secondary">
                        {tt.presenters.join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-brand-text-secondary whitespace-nowrap">
                        {new Date(tt.eventDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tt.status === TechTalkStatus.published ? (
                          <button
                            type="button"
                            data-testid={`unpublish-btn-${tt.id}`}
                            onClick={() => handleOpenUnpublishModal(tt.id)}
                            disabled={isMutating}
                            className="text-xs font-medium px-3 py-1.5 rounded border border-brand-red/20 text-brand-red hover:bg-brand-red/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`publish-btn-${tt.id}`}
                            onClick={() => handleOpenPublishModal(tt.id)}
                            disabled={isMutating}
                            className="text-xs font-medium px-3 py-1.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="px-4 py-3 border-t border-brand-border flex items-center justify-between text-xs text-brand-text-secondary bg-brand-bg/40"
              data-testid="pagination-controls"
            >
              <span>
                Page {page} of {totalPages} · {total} tech talk
                {total !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  data-testid="pagination-prev"
                  className="px-3 py-1.5 border border-brand-border rounded hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  data-testid="pagination-next"
                  className="px-3 py-1.5 border border-brand-border rounded hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

      <ConfirmationModal
        isOpen={selectedAction !== null}
        title={getModalTitle()}
        message={getModalMessage()}
        confirmText={getModalConfirmText()}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        isConfirming={isMutating}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </>
  );
}

// -- Page export (wrapped in RoleGuard) ---------------------------------------

export default function AdminTechTalksPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <TechTalkManagementContent />
    </RoleGuard>
  );
}