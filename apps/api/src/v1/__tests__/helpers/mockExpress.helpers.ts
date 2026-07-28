import { jest } from '@jest/globals';
import type { Request, Response } from 'express';

export function makeMockReqResNext(overrides: Partial<Request> = {}) {
  const req: Partial<Request> = {
    body: {},
    user: { userId: 'user-123' } as any,
    files: [],
    params: {},
    query: {},
    ...overrides,
  };

  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn() as any,
  };

  const next = jest.fn();

  return { req, res, next };
}
