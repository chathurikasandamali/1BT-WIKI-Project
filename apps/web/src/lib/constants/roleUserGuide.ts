import { UserRoleValue, type UserRole } from '@repo/shared';

export interface UserGuideSection {
  title: string;
  items: string[];
}

/**
 * Short in-app guides for staff roles. Regular users do not see this tab.
 */
export const ADMIN_USER_GUIDE: UserGuideSection[] = [
  {
    title: 'Home and navigation',
    items: [
      'Home opens the admin dashboard with wiki stats.',
      'Use the header search to find articles and tech talks.',
      'The bell shows your notifications.',
      'Sign out from the account menu in the header.',
    ],
  },
  {
    title: 'Your own articles',
    items: [
      'Create an article from My Articles.',
      'Save a draft, preview it when there is a title or body, then submit for review.',
      'You can embed images in the article body even before you add text.',
      'Generate a quiz after the article has a title, enough body text, and is saved.',
      'Edit drafts and rejected articles. You can delete articles you own.',
    ],
  },
  {
    title: 'Approvals',
    items: [
      'Approvals lists articles a Reviewer already approved.',
      'Publish an article to make it visible to everyone.',
    ],
  },
  {
    title: 'Users',
    items: [
      'User Management lists all accounts.',
      'Change a role to User, Reviewer, or Admin. Confirm the change before it applies.',
      'You cannot change the last active admin’s role until you promote someone else.',
      'Ban or unban an account. A reason is required to ban.',
    ],
  },
  {
    title: 'Article management',
    items: [
      'Browse articles by status: pending, approved, published, or unpublished.',
      'Open an approved article and publish it from the article page.',
    ],
  },
  {
    title: 'Tech talks',
    items: [
      'Create and edit tech talks.',
      'Publish, unpublish, or delete a tech talk.',
    ],
  },
  {
    title: 'Comments',
    items: [
      'Comment Moderation lists comments waiting for a decision.',
      'Approve a comment to show it, or reject it to hide it.',
    ],
  },
  {
    title: 'Profile',
    items: [
      'Update your name and profile photo here. Email and role cannot be changed by you.',
    ],
  },
];

export const REVIEWER_USER_GUIDE: UserGuideSection[] = [
  {
    title: 'Home and navigation',
    items: [
      'Home shows the latest updates feed.',
      'Use the header search to find articles and tech talks.',
      'The bell shows your notifications.',
      'Sign out from the account menu in the header.',
    ],
  },
  {
    title: 'Your own articles',
    items: [
      'Create an article from My Articles.',
      'Save a draft, preview it when there is a title or body, then submit for review.',
      'You can embed images in the article body even before you add text.',
      'Generate a quiz after the article has a title, enough body text, and is saved.',
      'Edit drafts and rejected articles. You can delete your own drafts.',
    ],
  },
  {
    title: 'Approvals',
    items: [
      'Approvals lists articles waiting for your review.',
      'Open an article, add comments on the text, then approve or reject it.',
      'Approve sends the article to an Admin to publish.',
      'Reject returns it to the author with your feedback.',
    ],
  },
  {
    title: 'What you cannot do',
    items: [
      'You cannot change user roles or ban accounts.',
      'You cannot publish articles.',
      'You cannot create or manage tech talks.',
      'You cannot moderate comments.',
    ],
  },
  {
    title: 'Profile',
    items: [
      'Update your name and profile photo here. Email and role cannot be changed by you.',
    ],
  },
];

/**
 * Returns the in-app user guide for a staff role, or null when the role has none.
 */
export function getRoleUserGuide(role: UserRole): UserGuideSection[] | null {
  if (role === UserRoleValue.Admin) {
    return ADMIN_USER_GUIDE;
  }
  if (role === UserRoleValue.Reviewer) {
    return REVIEWER_USER_GUIDE;
  }
  return null;
}
