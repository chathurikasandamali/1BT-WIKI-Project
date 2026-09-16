// apps/api/src/services/__tests__/user.service.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { User } from '@/types/userTypes.js';

// ESM mock — must be before any imports
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateRole: jest.fn(),
    updateBanStatus: jest.fn(),
  },
}));

// Mock pusherClient so the service never tries to connect to Pusher during tests.
const mockPusherTrigger = jest.fn<any>().mockResolvedValue(undefined);
await jest.unstable_mockModule('@v1/lib/pusherClient.js', () => ({
  default: { trigger: mockPusherTrigger },
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

    it('should trigger the Pusher role-changed event on the affected user private channel after a successful update', async () => {
      const updatedUser = makeUser({ id: '9', role: 'Reviewer' });
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: '9', role: 'User' })
      );
      mockedRepo.updateRole.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserRole('9', 'Reviewer');

      expect(result).toEqual(updatedUser);
      expect(mockPusherTrigger).toHaveBeenCalledTimes(1);
      expect(mockPusherTrigger).toHaveBeenCalledWith(
        'private-user-9',
        'role-changed',
        { role: 'Reviewer' }
      );
    });

    it('should NOT trigger Pusher when the database role update fails', async () => {
      mockedRepo.findById.mockResolvedValue(
        makeUser({ id: '9', role: 'User' })
      );
      mockedRepo.updateRole.mockRejectedValue(new Error('Database is down'));

      await expect(
        UserService.updateUserRole('9', 'Reviewer')
      ).rejects.toThrow('Database is down');

      expect(mockPusherTrigger).not.toHaveBeenCalled();
    });

    it('should NOT trigger Pusher when the target user does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(
        UserService.updateUserRole('nonexistent', 'Reviewer')
      ).rejects.toMatchObject({
        message: 'User not found',
      });

      expect(mockedRepo.updateRole).not.toHaveBeenCalled();
      expect(mockPusherTrigger).not.toHaveBeenCalled();
    });

    it('should reject an invalid role', async () => {
      await expect(
        UserService.updateUserRole('9', 'SuperAdmin' as never)
      ).rejects.toMatchObject({
        message: 'Role must be one of: Admin, Reviewer, User',
      });

      expect(mockedRepo.updateRole).not.toHaveBeenCalled();
      expect(mockPusherTrigger).not.toHaveBeenCalled();
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
