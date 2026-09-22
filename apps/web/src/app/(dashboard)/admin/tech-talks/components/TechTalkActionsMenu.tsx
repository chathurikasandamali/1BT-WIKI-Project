'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EditIcon } from '@/components/shared/icons/EditIcon';
import { TrashIcon } from '@/components/shared/icons/TrashIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';
import { menuPanelId, menuTriggerId } from '../constants/constants';
import type { MenuPosition } from '../constants/types';

const GAP = 4;
const MENU_WIDTH = 176; // w-44
// Rough height of the menu (up to 3 items + divider), used only to decide
// whether to flip. The flipped position is anchored by `bottom`, so the
// browser still grows the menu using its real height.
const ESTIMATED_MENU_HEIGHT = 140;

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50';

/**
 * Anchors the menu to its trigger, flipping it below when there isn't room
 * above — the first rows of the table would otherwise open upward into the
 * table header.
 */
function computeMenuPosition(rect: DOMRect): MenuPosition {
  const left = rect.right - MENU_WIDTH;
  const opensBelow = rect.top < ESTIMATED_MENU_HEIGHT + GAP;
  return opensBelow
    ? { top: rect.bottom + GAP, left }
    : { bottom: window.innerHeight - rect.top + GAP, left };
}

function MoreVerticalIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
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

interface TechTalkActionsMenuProps {
  techTalkId: string;
  isPublished: boolean;
  isOpen: boolean;
  /** Disables the mutating items while a confirmed action is in flight. */
  isMutating: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}

/**
 * Row-level "⋮" actions menu.
 *
 * The panel is portaled to <body> and positioned `fixed` so it escapes the
 * table's horizontally scrollable wrapper, which would otherwise clip it
 * (setting overflow-x also makes overflow-y clip). It stays mounted while
 * closed and is hidden with a class, matching the rest of the table's markup.
 */
export function TechTalkActionsMenu({
  techTalkId,
  isPublished,
  isOpen,
  isMutating,
  onToggle,
  onClose,
  onPublish,
  onUnpublish,
  onDelete,
}: TechTalkActionsMenuProps): React.JSX.Element {
  const [position, setPosition] = useState<MenuPosition | null>(null);

  // Keep the open menu pinned to its trigger. The position on open is set
  // synchronously in the click handler below, so there is no unpositioned
  // first frame to correct here.
  useEffect(() => {
    if (!isOpen) return;

    const reposition = (): void => {
      const trigger = document.getElementById(menuTriggerId(techTalkId));
      if (!trigger) return;
      setPosition(computeMenuPosition(trigger.getBoundingClientRect()));
    };

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, techTalkId]);

  const menu = (
    <div
      id={menuPanelId(techTalkId)}
      role="menu"
      aria-label="Actions"
      onClick={(e) => e.stopPropagation()}
      style={
        isOpen && position
          ? {
              left: position.left,
              ...(position.top !== undefined ? { top: position.top } : {}),
              ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
            }
          : undefined
      }
      className={cn(
        'fixed z-50 w-44 rounded border border-brand-border bg-brand-surface py-1 text-left shadow-lg focus:outline-none',
        isOpen ? 'block' : 'hidden'
      )}
    >
      <Link
        href={`/admin/tech-talks/${techTalkId}/edit`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        role="menuitem"
        data-testid={`edit-btn-${techTalkId}`}
        className={cn(MENU_ITEM_CLASS, 'text-brand-text-primary hover:bg-brand-hover')}
      >
        <EditIcon className="h-3.5 w-3.5 text-brand-text-secondary" />
        Edit
      </Link>

      {isPublished ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onUnpublish();
          }}
          role="menuitem"
          data-testid={`unpublish-btn-${techTalkId}`}
          disabled={isMutating}
          className={cn(MENU_ITEM_CLASS, 'text-brand-text-primary hover:bg-brand-hover')}
        >
          <BanIcon className="h-3.5 w-3.5 text-brand-text-secondary" />
          Unpublish
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onPublish();
          }}
          role="menuitem"
          data-testid={`publish-btn-${techTalkId}`}
          disabled={isMutating}
          className={cn(MENU_ITEM_CLASS, 'text-brand-text-primary hover:bg-brand-hover')}
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
          onClose();
          onDelete();
        }}
        role="menuitem"
        data-testid={`delete-btn-${techTalkId}`}
        disabled={isMutating}
        className={cn(MENU_ITEM_CLASS, 'text-brand-red hover:bg-brand-red/5')}
      >
        <TrashIcon className="h-3.5 w-3.5 text-brand-red" />
        Delete
      </button>
    </div>
  );

  return (
    <div className="relative inline-block text-left">
      <button
        id={menuTriggerId(techTalkId)}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) {
            setPosition(computeMenuPosition(e.currentTarget.getBoundingClientRect()));
          }
          onToggle();
        }}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red',
          isOpen && 'bg-brand-hover'
        )}
        data-testid={`actions-btn-${techTalkId}`}
        title="More actions"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVerticalIcon className="h-4 w-4 text-brand-text-secondary" />
      </button>

      {createPortal(menu, document.body)}
    </div>
  );
}
