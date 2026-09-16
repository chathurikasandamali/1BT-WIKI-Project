// apps/api/src/services/__tests__/user.service.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { User } from '@/types/userTypes.js';

// ESM mock — must be before any imports
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findActiveByRole: jest.fn(),
    updateRole: jest.fn(),
    updateBanStatus: jest.fn(),
  },
}));

// Import AFTER mock is registered
const { default: UserService } = await import('../userService.js');
const { default: UserRepository } =
  await import('@repositories/userRepository.js');

const mockedRepo = UserRepository as jest.Mocked<typeof UserRepository>;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  name: 'Test User',
  email: 'test@1billiontech.com',
  emailVerified: false,
  image: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  role: 'User',
  banned: null,
  banReason: null,
  banExpires: null,
  ...overrides,
});

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserRole', () => {
    it('should update a user role when the role is valid', async () => {
      const updatedUser = makeUser({ id: '9', role: 'Reviewer' });
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: '9', role: 'User' })
      );
      mockedRepo.updateRole.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserRole('9', 'Reviewer');

      expect(mockedRepo.findById).toHaveBeenCalledWith('9');
      expect(mockedRepo.updateRole).toHaveBeenCalledWith('9', 'Reviewer');
      expect(result).toEqual(updatedUser);
    });

    it('should reject an invalid role', async () => {
      await expect(
        UserService.updateUserRole('9', 'SuperAdmin' as never)
      ).rejects.toMatchObject({
        message: 'Role must be one of: Admin, Reviewer, User',
      });

      expect(mockedRepo.updateRole).not.toHaveBeenCalled();
    });

    it('should reject demoting the last active admin', async () => {
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: 'admin-1', role: 'Admin', banned: false })
      );
      mockedRepo.findActiveByRole.mockResolvedValue([
        makeUser({ id: 'admin-1', role: 'Admin', banned: false }),
      ]);

      await expect(
        UserService.updateUserRole('admin-1', 'User')
      ).rejects.toMatchObject({
        message:
          'Cannot change the role of the last active admin. Promote another user to Admin first.',
        statusCode: 400,
      });

      expect(mockedRepo.findActiveByRole).toHaveBeenCalledWith('Admin');
      expect(mockedRepo.updateRole).not.toHaveBeenCalled();
    });

    it('should allow demoting an admin when another active admin exists', async () => {
      const updatedUser = makeUser({ id: 'admin-1', role: 'Reviewer' });
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: 'admin-1', role: 'Admin', banned: false })
      );
      mockedRepo.findActiveByRole.mockResolvedValue([
        makeUser({ id: 'admin-1', role: 'Admin', banned: false }),
        makeUser({ id: 'admin-2', role: 'Admin', banned: false }),
      ]);
      mockedRepo.updateRole.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserRole('admin-1', 'Reviewer');

      expect(mockedRepo.findActiveByRole).toHaveBeenCalledWith('Admin');
      expect(mockedRepo.updateRole).toHaveBeenCalledWith('admin-1', 'Reviewer');
      expect(result).toEqual(updatedUser);
    });

    it('should allow demoting a banned admin without checking active admin count', async () => {
      const updatedUser = makeUser({
        id: 'admin-1',
        role: 'User',
        banned: true,
      });
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: 'admin-1', role: 'Admin', banned: true })
      );
      mockedRepo.updateRole.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserRole('admin-1', 'User');

      expect(mockedRepo.findActiveByRole).not.toHaveBeenCalled();
      expect(mockedRepo.updateRole).toHaveBeenCalledWith('admin-1', 'User');
      expect(result).toEqual(updatedUser);
    });
  });

  describe('updateUserBanStatus', () => {
    it('should deactivate a user when banned is true with reason', async () => {
      const updatedUser = makeUser({
        id: '5',
        banned: true,
        banReason: 'policy violation',
      });
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: '5', banned: false, banReason: null })
      );
      mockedRepo.updateBanStatus.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserBanStatus('5', {
        banned: true,
        banReason: 'policy violation',
      });

      expect(mockedRepo.findById).toHaveBeenCalledWith('5');
      expect(mockedRepo.updateBanStatus).toHaveBeenCalledWith('5', {
        banned: true,
        banReason: 'policy violation',
      });
      expect(result).toEqual(updatedUser);
    });

    it('should reactivate a user when banned is false', async () => {
      const updatedUser = makeUser({ id: '6', banned: false, banReason: null });
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: '6', banned: true, banReason: 'temporary block' })
      );
      mockedRepo.updateBanStatus.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserBanStatus('6', {
        banned: false,
      });

      expect(mockedRepo.findById).toHaveBeenCalledWith('6');
      expect(mockedRepo.updateBanStatus).toHaveBeenCalledWith('6', {
        banned: false,
        banReason: null,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should reject banning without reason', async () => {
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: '7', banned: false, banReason: null })
      );

      await expect(
        UserService.updateUserBanStatus('7', {
          banned: true,
        })
      ).rejects.toMatchObject({
        message: 'Ban reason is required when banning a user',
      });

      expect(mockedRepo.updateBanStatus).not.toHaveBeenCalled();
    });
  });
});
