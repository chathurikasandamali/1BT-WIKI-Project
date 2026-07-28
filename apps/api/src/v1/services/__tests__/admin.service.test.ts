// apps/api/src/services/__tests__/admin.service.test.ts
//
// Unit tests for AdminService — the service layer that sits between
// adminController and adminRepository.
//
// Strategy:
//   Mock adminRepository before importing AdminService so Jest replaces the
//   real DB calls with controllable fakes (ESM hoisting requirement).

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { User, CreateUserInput } from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// ESM mock — must be registered BEFORE any dynamic imports
// ---------------------------------------------------------------------------

await jest.unstable_mockModule('@repositories/adminRepository.js', () => ({
  default: {
    getAllUsers: jest.fn(),
    createAdminUser: jest.fn(),
  },
}));

await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findByEmail: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mock is registered
// ---------------------------------------------------------------------------

const { default: AdminService } = await import('../adminService.js');
const { default: AdminRepository } =
  await import('@repositories/adminRepository.js');
const { default: UserRepository } =
  await import('@repositories/userRepository.js');

const mockedRepo = AdminRepository as jest.Mocked<typeof AdminRepository>;
const mockedUserRepo = UserRepository as jest.Mocked<typeof UserRepository>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getAllUsers ─────────────────────────────────────────────────────────────

  describe('getAllUsers', () => {
    it('should return all users from the repository', async () => {
      const mockUsers: User[] = [
        makeUser({
          id: '1',
          name: 'Malindu',
          email: 'malindu@1billiontech.com',
        }),
        makeUser({ id: '2', name: 'Lahiru', email: 'lahiru@1billiontech.com' }),
      ];

      mockedRepo.getAllUsers.mockResolvedValue(mockUsers);

      const result = await AdminService.getAllUsers();

      expect(mockedRepo.getAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUsers);
    });

    it('should return an empty array when no users exist', async () => {
      mockedRepo.getAllUsers.mockResolvedValue([]);

      const result = await AdminService.getAllUsers();

      expect(mockedRepo.getAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should propagate errors thrown by the repository', async () => {
      mockedRepo.getAllUsers.mockRejectedValue(
        Object.assign(new Error('Database is unavailable'), { statusCode: 503 })
      );

      await expect(AdminService.getAllUsers()).rejects.toMatchObject({
        message: 'Database is unavailable',
      });

      expect(mockedRepo.getAllUsers).toHaveBeenCalledTimes(1);
    });
  });

  // ── adminCreateUser ────────────────────────────────────────────────────────

  describe('adminCreateUser', () => {
    it('should create and return a new user', async () => {
      const input: CreateUserInput = {
        name: 'Chathurika',
        email: 'chathurika@1billiontech.com',
        role: 'User',
      };
      const mockCreated = makeUser({ id: '3', ...input });

      mockedUserRepo.findByEmail.mockResolvedValue(null);
      mockedRepo.createAdminUser.mockResolvedValue(mockCreated);

      const result = await AdminService.adminCreateUser(input);

      expect(mockedUserRepo.findByEmail).toHaveBeenCalledWith(
        'chathurika@1billiontech.com'
      );
      expect(mockedRepo.createAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Chathurika',
          email: 'chathurika@1billiontech.com',
          role: 'User',
        })
      );
      expect(result).toEqual(mockCreated);
    });

    it('should reject invalid email format', async () => {
      const input: CreateUserInput = {
        name: 'Invalid Email',
        email: 'not-an-email',
      };

      await expect(AdminService.adminCreateUser(input)).rejects.toMatchObject({
        message: 'Email format is invalid',
      });

      expect(mockedUserRepo.findByEmail).not.toHaveBeenCalled();
      expect(mockedRepo.createAdminUser).not.toHaveBeenCalled();
    });

    it('should reject duplicate email with conflict', async () => {
      const input: CreateUserInput = {
        name: 'Duplicate',
        email: 'duplicate@1billiontech.com',
      };
      mockedUserRepo.findByEmail.mockResolvedValue(
        makeUser({ id: '4', email: 'duplicate@1billiontech.com' })
      );

      await expect(AdminService.adminCreateUser(input)).rejects.toMatchObject({
        message: 'A user with this email already exists',
      });

      expect(mockedRepo.createAdminUser).not.toHaveBeenCalled();
    });
  });
});
