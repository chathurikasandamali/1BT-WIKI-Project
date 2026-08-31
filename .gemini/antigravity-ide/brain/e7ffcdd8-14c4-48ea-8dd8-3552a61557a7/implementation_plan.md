# Extract All Inline SVGs

The goal is to extract all inline `<svg>` elements across the frontend codebase into reusable React components in `apps/web/src/components/shared/icons/`.

## User Review Required

Please review the proposed icon extractions below. Once approved, I will systematically extract these icons and update the respective files.

## Proposed Changes

### New Icon Components (`apps/web/src/components/shared/icons/`)

I will inspect the identified files and create reusable components for all SVGs found. Examples of expected icons include:

- `SearchIcon.tsx`
- `BellIcon.tsx`
- `ChevronDownIcon.tsx`
- `HomeIcon.tsx`
- `UsersIcon.tsx`
- `SettingsIcon.tsx`
- `PlusIcon.tsx`
- `SpinnerIcon.tsx`
- `CheckCircleIcon.tsx`
- `AlertCircleIcon.tsx`
- `TrashIcon.tsx`
- `ImageIcon.tsx`
- `FileTextIcon.tsx`
- (And any others identified during execution)

### Files to Update

I will replace inline SVGs with the new icon components in the following files:

#### [MODIFY] `apps/web/src/app/signin/page.tsx`

#### [MODIFY] `apps/web/src/components/layout/Sidebar.tsx`

#### [MODIFY] `apps/web/src/components/layout/Navbar.tsx`

#### [MODIFY] `apps/web/src/components/editor/FeaturedMediaBox.tsx`

#### [MODIFY] `apps/web/src/components/editor/DraftManagerSidebar.tsx`

#### [MODIFY] `apps/web/src/components/editor/EditorHeader.tsx`

#### [MODIFY] `apps/web/src/app/(dashboard)/settings/page.tsx`

#### [MODIFY] `apps/web/src/app/(dashboard)/articles/page.tsx`

#### [MODIFY] `apps/web/src/app/(dashboard)/articles/[id]/page.tsx`

#### [MODIFY] `apps/web/src/app/(dashboard)/admin/users/BanModal.tsx`

#### [MODIFY] `apps/web/src/app/(dashboard)/admin/users/UserManagementTable.tsx`

#### [MODIFY] `apps/web/src/app/(dashboard)/admin/users/page.tsx`

#### [MODIFY] `apps/web/src/components/article-detail/CommentItem.tsx`

## Verification Plan

### Automated Tests

- Run `npm run lint` or `npm run typecheck` to ensure no import errors or TypeScript issues were introduced.

### Manual Verification

- Visual check of the updated components to ensure icons render with the correct size and color.
