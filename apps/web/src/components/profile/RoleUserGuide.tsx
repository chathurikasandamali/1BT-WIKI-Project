import React from 'react';
import { UserRoleValue, type UserRole } from '@repo/shared';
import { getRoleUserGuide } from '@/lib/constants/roleUserGuide';

interface RoleUserGuideProps {
  role: UserRole;
}

function roleArticle(role: UserRole): string {
  if (role === UserRoleValue.Admin) {
    return 'an';
  }
  return 'a';
}

/**
 * Plain-text staff guide shown on Account Settings for Admin and Reviewer.
 */
export function RoleUserGuide({ role }: RoleUserGuideProps): React.JSX.Element {
  const sections = getRoleUserGuide(role);

  if (!sections) {
    return (
      <p className="text-sm text-brand-text-secondary" data-testid="user-guide-empty">
        No user guide is available for this role.
      </p>
    );
  }

  return (
    <div data-testid="user-guide" className="space-y-8">
      <p className="text-sm text-brand-text-secondary">
        What you can do in 1BT Wiki as {roleArticle(role)} {role}.
      </p>
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="mb-2 text-sm font-semibold text-brand-text-primary">
            {section.title}
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-brand-text-primary">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
