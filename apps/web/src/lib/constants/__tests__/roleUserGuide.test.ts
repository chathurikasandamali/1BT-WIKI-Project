import { UserRoleValue } from '@repo/shared';
import {
  ADMIN_USER_GUIDE,
  REVIEWER_USER_GUIDE,
  getRoleUserGuide,
} from '@/lib/constants/roleUserGuide';

describe('getRoleUserGuide', () => {
  it('returns the admin guide for Admin', () => {
    expect(getRoleUserGuide(UserRoleValue.Admin)).toBe(ADMIN_USER_GUIDE);
  });

  it('returns the reviewer guide for Reviewer', () => {
    expect(getRoleUserGuide(UserRoleValue.Reviewer)).toBe(REVIEWER_USER_GUIDE);
  });

  it('returns null for a regular User', () => {
    expect(getRoleUserGuide(UserRoleValue.User)).toBeNull();
  });
});
