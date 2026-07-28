// apps/api/src/v1/controllers/pusherController.ts

import type { Request, Response, NextFunction } from 'express';
import pusherClient from '@v1/lib/pusherClient.js';
import { pusherChannelName } from '@v1/lib/pusherEvents.js';

// ---------------------------------------------------------------------------
// POST /api/v1/pusher/auth
// ---------------------------------------------------------------------------

/**
 * Authenticates a pusher-js client for a private Pusher channel.
 *
 * Requires: `authenticate` middleware upstream (sets req.user).
 *
 * @description
 * Security:
 * - Only allows a user to subscribe to their own private channel.
 * - channel_name must equal `private-user-{req.user.userId}`.
 * - Any mismatch is a 403 — prevents subscribing to another user's channel.
 *
 * The response is wrapped in the project's standard envelope so the frontend
 * custom authorizer can extract `response.data` and pass it to pusher-js.
 *
 * @param {Request} req - The Express request object.
 * @param {Object} req.body - The JSON payload (application/json).
 * @param {string} req.body.socket_id - The Pusher socket ID.
 * @param {string} req.body.channel_name - The private channel name requested.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function.
 * @returns {Promise<void>} Resolves when the response is sent.
 *
 * @example
 * // Response: 200 OK
 * // {
 * //   "success": true,
 * //   "data": {
 * //     "auth": "key:signature"
 * //   }
 * // }
 */
const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    const { socket_id, channel_name } = req.body as {
      socket_id?: string;
      channel_name?: string;
    };

    if (!socket_id || !channel_name) {
      res.status(400).json({
        success: false,
        error: 'Missing socket_id or channel_name',
      });
      return;
    }

    // Enforce channel ownership — a user may only subscribe to their own channel.
    const expectedChannel = pusherChannelName(userId);
    if (channel_name !== expectedChannel) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const authToken = pusherClient.authorizeChannel(socket_id, channel_name);

    // Wrap in the project's standard response envelope.
    // The frontend custom authorizer extracts `response.data` and passes it
    // directly to the pusher-js authorize callback.
    res.status(200).json({ success: true, data: authToken });
  } catch (error) {
    next(error);
  }
};

export default { auth };
