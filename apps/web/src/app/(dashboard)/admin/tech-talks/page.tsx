'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRoleValue } from '@repo/shared';
import {
  listAll,
  publishTechTalk,
  unpublishTechTalk,
  deleteTechTalk,
  type AdminTechTalkListQuery,
} from '@/lib/api/techTalks';
import { useAllTechTalks } from '@/lib/hooks/useTechTalks';
import { useToast } from '@/lib/hooks/useToast';
import { Toast } from '@/components/shared/Toast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { PageLoader } from '@/components/shared/PageLoader';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { FilterChip } from '@/components/admin/FilterChip';
import { SortableHeader } from '@/components/admin/SortableHeader';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TechTalkStatus } from '@repo/shared';

import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { EditIcon } from '@/components/shared/icons/EditIcon';
import { TrashIcon } from '@/components/shared/icons/TrashIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';
import { FileIcon } from '@/components/shared/icons/FileIcon';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { PlusIcon } from '@/components/shared/icons/PlusIcon';

gsap.registerPlugin(useGSAP);

// -- Internal types -----------------------------------------------------------

type SortField = 'title' | 'eventDate';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 12;
const STATUS_FILTERS: Array<TechTalkStatus | 'All'> = [
  'All',
  TechTalkStatus.draft,
  TechTalkStatus.published,
  TechTalkStatus.unpublished,
];

const STATUS_FILTER_LABELS: Record<TechTalkStatus | 'All', string> = {
  All: 'All statuses',
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
};

function MoreVerticalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
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
  const [statusFilter, setStatusFilter] = useState<TechTalkStatus | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // Dropdown visibility state
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

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

  const query: AdminTechTalkListQuery = {
    page,
    limit: PAGE_SIZE,
    status: statusFilter === 'All' ? undefined : statusFilter,
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

  // Click-outside and keydown listener for actions dropdown
  useEffect(() => {
    if (!activeDropdownId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdownElement = document.getElementById(`dropdown-menu-${activeDropdownId}`);
      const triggerElement = document.getElementById(`dropdown-trigger-${activeDropdownId}`);

      const clickedInsideDropdown = dropdownElement?.contains(target);
      const clickedTrigger = triggerElement?.contains(target);

      if (!clickedInsideDropdown && !clickedTrigger) {
        setActiveDropdownId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdownId(null);
        const triggerElement = document.getElementById(`dropdown-trigger-${activeDropdownId}`);
        triggerElement?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdownId]);

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
  const isInitialLoad = loading && techTalks.length === 0 && !error;

  const applyStatusFilter = (status: TechTalkStatus | 'All'): void => {
    setStatusFilter(status);
    setPage(1);
  };

  // ── Action modal state — covers Publish, Unpublish, and Delete ────────────────

  type ModalAction =
    | typeof TechTalkStatus.published
    | typeof TechTalkStatus.unpublished
    | 'delete';

  const [selectedTechTalkId, setSelectedTechTalkId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModalAction | null>(null);
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

  const handleOpenDeleteModal = (id: string) => {
    setSelectedTechTalkId(id);
    setSelectedAction('delete');
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
      } else if (selectedAction === TechTalkStatus.unpublished) {
        await unpublishTechTalk(selectedTechTalkId);
        showToast('Tech Talk unpublished successfully', 'success');
      } else {
        await deleteTechTalk(selectedTechTalkId);
        showToast('Tech Talk deleted successfully', 'success');
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
    if (selectedAction === 'delete') return 'Delete Tech Talk?';
    return '';
  };

  const getModalMessage = (): string => {
    if (selectedAction === TechTalkStatus.published)
      return 'Are you sure you want to publish this Tech Talk?';
    if (selectedAction === TechTalkStatus.unpublished)
      return 'Are you sure you want to unpublish this Tech Talk?';
    if (selectedAction === 'delete')
      return 'Are you sure you want to delete this Tech Talk? This action cannot be undone.';
    return '';
  };

  const getModalConfirmText = (): string => {
    if (selectedAction === TechTalkStatus.published) return 'Publish';
    if (selectedAction === TechTalkStatus.unpublished) return 'Unpublish';
    if (selectedAction === 'delete') return 'Delete';
    return 'Confirm';
  };

  if (isInitialLoad) {
    return (
      <PageLoader
        testId="admin-techtalks-loading"
        message="Loading Tech Talks"
      />
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl p-8" ref={containerRef}>
        <div className="page-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              className="flex items-center gap-2 rounded bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-red-hover"
            >
              <PlusIcon className="h-4 w-4" />
              Create Tech Talk
            </Link>
            <button
              type="button"
              onClick={async () => {
                await refetch();
                await loadStatusCounts();
              }}
              data-testid="refresh-btn"
              disabled={loading}
              className="flex items-center gap-2 rounded border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              <RefreshIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            className="mb-6 flex items-center justify-between rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
            data-testid="admin-techtalks-error"
          >
            <span>{error}</span>
            <button
              onClick={() => refetch()}
              className="ml-4 text-xs text-brand-red underline hover:text-brand-red-hover"
            >
              Retry
            </button>
          </div>
        )}

        {!error && statusCounts && (
          <div className="page-header mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardWidget
              label="Total Tech Talks"
              description="Talks across every status"
              value={statusCounts.all}
              onClick={() => applyStatusFilter('All')}
              selected={statusFilter === 'All'}
              icon={<TechTalkIcon className="h-4 w-4" />}
              borderClassName="border-brand-border"
              testId="total-techtalks-stat"
            />
            <DashboardWidget
              label="Published"
              description="Visible to everyone"
              value={statusCounts.published}
              onClick={() => applyStatusFilter(TechTalkStatus.published)}
              selected={statusFilter === TechTalkStatus.published}
              icon={<CheckCircleIcon className="h-4 w-4" />}
              valueClassName="text-green-600"
              iconClassName="bg-green-50 text-green-700"
              borderClassName="border-green-200"
              testId="published-techtalks-stat"
            />
            <DashboardWidget
              label="Draft"
              description="Not published yet"
              value={statusCounts.draft}
              onClick={() => applyStatusFilter(TechTalkStatus.draft)}
              selected={statusFilter === TechTalkStatus.draft}
              icon={<FileIcon className="h-4 w-4" strokeWidth={2} />}
              valueClassName="text-amber-600"
              iconClassName="bg-amber-50 text-amber-700"
              borderClassName="border-amber-200"
              testId="draft-techtalks-stat"
            />
            <DashboardWidget
              label="Unpublished"
              description="Removed from the public list"
              value={statusCounts.unpublished}
              onClick={() => applyStatusFilter(TechTalkStatus.unpublished)}
              selected={statusFilter === TechTalkStatus.unpublished}
              icon={<BanIcon className="h-4 w-4" />}
              valueClassName="text-brand-red"
              iconClassName="bg-brand-red/10 text-brand-red"
              borderClassName="border-brand-red/25"
              testId="unpublished-techtalks-stat"
            />
          </div>
        )}

        <section className="table-card overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm text-left">
          <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-brand-text-primary">
                Tech Talks
              </h2>
              <p className="mt-0.5 text-xs text-brand-text-secondary">
                Search, filter, and manage talks on the publishing calendar.
              </p>
            </div>

            <div className="relative min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
              </span>
              <input
                type="search"
                placeholder="Search by title"
                data-testid="techtalk-search-input"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                applyStatusFilter(e.target.value as TechTalkStatus | 'All')
              }
              data-testid="techtalk-status-filter"
              className="sr-only"
              aria-label="Filter Tech Talks by status"
            >
              <option value="All">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map((status) => (
                <FilterChip
                  key={status}
                  label={STATUS_FILTER_LABELS[status]}
                  selected={statusFilter === status}
                  onClick={() => applyStatusFilter(status)}
                />
              ))}
            </div>
          </div>

          {loading && (
            <PageLoader
              testId="admin-techtalks-loading"
              message="Loading Tech Talks"
              className="min-h-0 py-20"
            />
          )}
          {!loading && techTalks.length === 0 && (
            <div
              className="py-20 text-center text-sm text-brand-text-secondary"
              data-testid="admin-techtalks-empty"
            >
              No Tech Talks found.
            </div>
          )}
          {!loading && techTalks.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-bg/40">
                      <SortableHeader
                        label="Title"
                        field="title"
                        activeField={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
                        Presenters
                      </th>
                      <SortableHeader
                        label="Event date"
                        field="eventDate"
                        activeField={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <th className="w-20 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {techTalks.map((tt) => {
                      const isPublished = tt.status === TechTalkStatus.published;
                      return (
                        <tr
                          key={tt.id}
                          className="techtalk-row transition-colors hover:bg-brand-hover"
                          data-testid={`techtalk-row-${tt.id}`}
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/tech-talks/${tt.id}`}
                              className="font-medium text-brand-text-primary transition-colors hover:text-brand-red"
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
                          <td className="whitespace-nowrap px-4 py-3 text-brand-text-secondary">
                            {formatDate(tt.eventDate)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={cn(
                                'relative inline-block text-left',
                                activeDropdownId === tt.id ? 'z-50' : 'z-10'
                              )}
                            >
                              <button
                                id={`dropdown-trigger-${tt.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(
                                    activeDropdownId === tt.id ? null : tt.id
                                  );
                                }}
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red',
                                  activeDropdownId === tt.id && 'bg-brand-hover'
                                )}
                                data-testid={`actions-btn-${tt.id}`}
                                title="More actions"
                                aria-label="More actions"
                                aria-haspopup="true"
                                aria-expanded={activeDropdownId === tt.id}
                              >
                                <MoreVerticalIcon className="h-4 w-4 text-brand-text-secondary" />
                              </button>

                              <div
                                id={`dropdown-menu-${tt.id}`}
                                role="menu"
                                aria-label="Actions"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'absolute right-0 z-50 mb-1 w-44 origin-top-right rounded border border-brand-border bg-brand-surface py-1 text-left shadow-lg bottom-full focus:outline-none',
                                  activeDropdownId === tt.id ? 'block' : 'hidden'
                                )}
                              >
                                <Link
                                  href={`/admin/tech-talks/${tt.id}/edit`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                  }}
                                  role="menuitem"
                                  data-testid={`edit-btn-${tt.id}`}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-text-primary transition-colors hover:bg-brand-hover"
                                >
                                  <EditIcon className="h-3.5 w-3.5 text-brand-text-secondary" />
                                  Edit
                                </Link>

                                {isPublished && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownId(null);
                                      handleOpenUnpublishModal(tt.id);
                                    }}
                                    role="menuitem"
                                    data-testid={`unpublish-btn-${tt.id}`}
                                    disabled={isMutating}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-text-primary transition-colors hover:bg-brand-hover disabled:opacity-50"
                                  >
                                    <BanIcon className="h-3.5 w-3.5 text-brand-text-secondary" />
                                    Unpublish
                                  </button>
                                )}
                                {!isPublished && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownId(null);
                                      handleOpenPublishModal(tt.id);
                                    }}
                                    role="menuitem"
                                    data-testid={`publish-btn-${tt.id}`}
                                    disabled={isMutating}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-text-primary transition-colors hover:bg-brand-hover disabled:opacity-50"
                                  >
                                    <CheckCircleIcon className="h-3.5 w-3.5 text-brand-text-secondary" />
                                    Publish
                                  </button>
                                )}

                                <div className="my-1 border-t border-brand-border" />

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    handleOpenDeleteModal(tt.id);
                                  }}
                                  role="menuitem"
                                  data-testid={`delete-btn-${tt.id}`}
                                  disabled={isMutating}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-red transition-colors hover:bg-brand-red/5 disabled:opacity-50"
                                >
                                  <TrashIcon className="h-3.5 w-3.5 text-brand-red" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="flex items-center justify-between border-t border-brand-border bg-brand-bg/40 px-4 py-3 text-xs text-brand-text-secondary"
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
                    className="rounded border border-brand-border px-3 py-1.5 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    data-testid="pagination-next"
                    className="rounded border border-brand-border px-3 py-1.5 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
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
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <TechTalkManagementContent />
    </RoleGuard>
  );
}