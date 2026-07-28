export function createTestUserHeaders({
  userId = 'user-1',
  email = 'user@example.com',
  role = 'User'
}: {
  userId?: string;
  email?: string;
  role?: string;
} = {}) {
  return {
    'x-test-user-id': userId,
    'x-test-user-email': email,
    'x-test-user-role': role,
  };
}
