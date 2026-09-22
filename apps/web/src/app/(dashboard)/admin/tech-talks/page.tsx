'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { UserRoleValue } from '@repo/shared';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAllTechTalks } from '@/lib/hooks/useTechTalks';
import { Toast } from '@/components/shared/Toast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { PageLoader } from '@/components/shared/PageLoader';
import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { PlusIcon } from '@/components/shared/icons/PlusIcon';
import { PAGE_SIZE } from './constants/constants';
import { TechTalkFilterBar } from './components/TechTalkFilterBar';
import { TechTalkPagination } from './components/TechTalkPagination';
import { TechTalkStatsRow } from './components/TechTalkStatsRow';
import { TechTalkTable } from './components/TechTalkTable';
import { useActionsMenu } from './hooks/useActionsMenu';
import { useTechTalkActions } from './hooks/useTechTalkActions';
import { useTechTalkFilters } from './hooks/useTechTalkFilters';
import { useTechTalkStatusCounts } from './hooks/useTechTalkStatusCounts';

gsap.registerPlugin(useGSAP);

function TechTalkManagementContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const filters = useTechTalkFilters();
  const { techTalks, total, loading, error, refetch } = useAllTechTalks(filters.query);
  const { counts, reload: reloadCounts } = useTechTalkStatusCounts();
  const menu = useActionsMenu();

  const refreshAll = async (): Promise<void> => {
    await refetch();
    await reloadCounts();
  };

  const actions = useTechTalkActions(refreshAll);

  useGSAP(
    () => {
      if (loading || error || !containerRef.current) return;

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
        { x: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', delay: 0.18 }
      );
    },
    { scope: containerRef, dependencies: [loading, error] }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isInitialLoad = loading && techTalks.length === 0 && !error;

  if (isInitialLoad) {
    return <PageLoader testId="admin-techtalks-loading" message="Loading Tech Talks" />;
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
              onClick={() => void refreshAll()}
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

        {!error && counts && (
          <TechTalkStatsRow
            counts={counts}
            statusFilter={filters.statusFilter}
            onSelect={filters.applyStatusFilter}
          />
        )}

        <section className="table-card overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm text-left">
          <TechTalkFilterBar
            search={filters.search}
            onSearchChange={filters.onSearchChange}
            statusFilter={filters.statusFilter}
            onStatusFilterChange={filters.applyStatusFilter}
          />

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
              <TechTalkTable
                techTalks={techTalks}
                sortField={filters.sortField}
                sortDir={filters.sortDir}
                onSort={filters.toggleSort}
                activeMenuId={menu.activeId}
                onToggleMenu={menu.toggle}
                onCloseMenu={menu.close}
                isMutating={actions.isMutating}
                onPublish={actions.requestPublish}
                onUnpublish={actions.requestUnpublish}
                onDelete={actions.requestDelete}
              />

              <TechTalkPagination
                page={filters.page}
                totalPages={totalPages}
                total={total}
                onPageChange={filters.setPage}
              />
            </>
          )}
        </section>
      </div>

      <ConfirmationModal {...actions.modal} />

      <Toast
        visible={actions.toast.visible}
        message={actions.toast.message}
        type={actions.toast.type}
      />
    </>
  );
}

export default function AdminTechTalksPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <TechTalkManagementContent />
    </RoleGuard>
  );
}
