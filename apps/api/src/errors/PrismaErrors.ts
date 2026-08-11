export const isPrismaNotFoundError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code?: string }).code === 'P2025'
  );
};