// apps/api/src/services/__tests__/profile.service.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { User } from '@/types/userTypes.js';

// ── ESM mock registration — must be before any import of the service ────────
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    getAll: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createAdminUser: jest.fn(),
    updateById: jest.fn(),
  },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: ProfileService } = await import('../profileService.js');
const { default: UserRepository } =
  await import('@repositories/userRepository.js');

const mockedRepo = UserRepository as jest.Mocked<typeof UserRepository>;

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------

/** Build a complete neon_auth.user row with sensible defaults. */
const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  name: 'Malindu Gurunada',
  email: 'malindu@1billiontech.com',
  emailVerified: true,
  image: 'https://example.com/avatar.png',
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

describe('ProfileService.getProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Success ──────────────────────────────────────────────────────────────

  it('should return a safe UserProfile when the user exists', async () => {
    // Arrange
    const rawUser = makeUser();
    mockedRepo.findById.mockResolvedValue(rawUser);

    // Act
    const result = await ProfileService.getProfile('user-123');

    // Assert — repository called with correct id
    expect(mockedRepo.findById).toHaveBeenCalledTimes(1);
    expect(mockedRepo.findById).toHaveBeenCalledWith('user-123');

    // Assert — returned shape matches UserProfile (safe fields only)
    expect(result).toEqual({
      id: 'user-123',
      name: 'Malindu Gurunada',
      email: 'malindu@1billiontech.com',
      avatarUrl: 'https://example.com/avatar.png', // image → avatarUrl
      role: 'User',
      isActive: true, // banned=null → isActive=true
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    // Assert — sensitive fields are NOT present on the result
    expect(result).not.toHaveProperty('emailVerified');
    expect(result).not.toHaveProperty('banned');
    expect(result).not.toHaveProperty('banReason');
    expect(result).not.toHaveProperty('banExpires');
    expect(result).not.toHaveProperty('updatedAt');
  });

  it('should map image=null to avatarUrl=null', async () => {
    // Arrange
    const rawUser = makeUser({ image: null });
    mockedRepo.findById.mockResolvedValue(rawUser);

    // Act
    const result = await ProfileService.getProfile('user-123');

    // Assert
    expect(result.avatarUrl).toBeNull();
  });

  it('should set isActive=false when user is banned', async () => {
    // Arrange
    const rawUser = makeUser({ banned: true, banReason: 'Policy violation' });
    mockedRepo.findById.mockResolvedValue(rawUser);

    // Act
    const result = await ProfileService.getProfile('user-123');

    // Assert
    expect(result.isActive).toBe(false);
  });

  it('should set isActive=true when banned=false', async () => {
    // Arrange
    const rawUser = makeUser({ banned: false });
    mockedRepo.findById.mockResolvedValue(rawUser);

    // Act
    const result = await ProfileService.getProfile('user-123');

    // Assert
    expect(result.isActive).toBe(true);
  });

  // ── Not found (404) ───────────────────────────────────────────────────────

  it('should throw AppError 404 when the user does not exist', async () => {
    // Arrange
    mockedRepo.findById.mockResolvedValue(null);

    // Act + Assert
    await expect(ProfileService.getProfile('ghost-id')).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });

    expect(mockedRepo.findById).toHaveBeenCalledTimes(1);
    expect(mockedRepo.findById).toHaveBeenCalledWith('ghost-id');
  });
  // ── Role capitalisation ─────────────────────────────────────────────────

  it('should capitalise a lowercase DB role (e.g. "admin" → "Admin")', async () => {
    const rawUser = makeUser({ role: 'admin' });
    mockedRepo.findById.mockResolvedValue(rawUser);

    const result = await ProfileService.getProfile('user-123');

    expect(result.role).toBe('Admin');
  });

  it('should capitalise a lowercase "user" role from DB', async () => {
    const rawUser = makeUser({ role: 'user' });
    mockedRepo.findById.mockResolvedValue(rawUser);

    const result = await ProfileService.getProfile('user-123');

    expect(result.role).toBe('User');
  });

  it('should default to "User" when DB role is null', async () => {
    const rawUser = makeUser({ role: null });
    mockedRepo.findById.mockResolvedValue(rawUser);

    const result = await ProfileService.getProfile('user-123');

    expect(result.role).toBe('User');
  });
});

describe('ProfileService.updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully update name only', async () => {
    const rawUser = makeUser({ name: 'New Name' });
    mockedRepo.updateById.mockResolvedValue(rawUser);

    const result = await ProfileService.updateProfile('user-123', {
      name: 'New Name',
    });

    expect(mockedRepo.updateById).toHaveBeenCalledTimes(1);
    expect(mockedRepo.updateById).toHaveBeenCalledWith('user-123', {
      name: 'New Name',
    });
    expect(result.name).toBe('New Name');
  });

  it('should successfully update name and avatarUrl', async () => {
    const rawUser = makeUser({
      name: 'New Name',
      image: 'https://example.com/new.png',
    });
    mockedRepo.updateById.mockResolvedValue(rawUser);

    const result = await ProfileService.updateProfile('user-123', {
      name: 'New Name',
      avatarUrl: 'https://example.com/new.png',
    });

    expect(mockedRepo.updateById).toHaveBeenCalledTimes(1);
    expect(mockedRepo.updateById).toHaveBeenCalledWith('user-123', {
      name: 'New Name',
      image: 'https://example.com/new.png',
    });
    expect(result.avatarUrl).toBe('https://example.com/new.png');
  });

  it('should throw AppError 400 for empty name', async () => {
    await expect(
      ProfileService.updateProfile('user-123', { name: '   ' })
    ).rejects.toMatchObject({
      message: 'Name cannot be empty',
      statusCode: 400,
    });
    expect(mockedRepo.updateById).not.toHaveBeenCalled();
  });

  it('should throw AppError 400 for name exceeding 255 characters', async () => {
    const longName = 'a'.repeat(256);
    await expect(
      ProfileService.updateProfile('user-123', { name: longName })
    ).rejects.toMatchObject({
      message: 'Name cannot exceed 255 characters',
      statusCode: 400,
    });
    expect(mockedRepo.updateById).not.toHaveBeenCalled();
  });

  it('should throw AppError 400 for invalid avatarUrl format', async () => {
    await expect(
      ProfileService.updateProfile('user-123', { avatarUrl: 'not-a-url' })
    ).rejects.toMatchObject({
      message: 'Invalid avatarUrl format',
      statusCode: 400,
    });
    expect(mockedRepo.updateById).not.toHaveBeenCalled();
  });

  it('should strip disallowed fields (role, email, banned, contactDetails) before calling repository', async () => {
    const rawUser = makeUser({ name: 'Safe Name' });
    mockedRepo.updateById.mockResolvedValue(rawUser);

    const input = {
      name: 'Safe Name',
      role: 'Admin',
      email: 'hacked@example.com',
      banned: true,
      contactDetails: '123 fake street',
    } as any; // Cast to any to simulate malicious input

    await ProfileService.updateProfile('user-123', input);

    expect(mockedRepo.updateById).toHaveBeenCalledTimes(1);
    expect(mockedRepo.updateById).toHaveBeenCalledWith('user-123', {
      name: 'Safe Name',
    });
  });

  it('should throw AppError 404 when the user does not exist', async () => {
    mockedRepo.updateById.mockResolvedValue(null);

    await expect(
      ProfileService.updateProfile('ghost-id', { name: 'New Name' })
    ).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
    expect(mockedRepo.updateById).toHaveBeenCalledWith('ghost-id', {
      name: 'New Name',
    });
  });
  // ── Role capitalisation ─────────────────────────────────────────────────

  it('should capitalise a lowercase DB role in the update response', async () => {
    const rawUser = makeUser({ name: 'New Name', role: 'reviewer' });
    mockedRepo.updateById.mockResolvedValue(rawUser);

    const result = await ProfileService.updateProfile('user-123', {
      name: 'New Name',
    });

    expect(result.role).toBe('Reviewer');
  });
});
