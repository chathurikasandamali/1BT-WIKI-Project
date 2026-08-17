/**
 * Controller for the admin settings endpoints.
 *
 * Mounted in adminRoutes behind `authenticate` + `requireRole('Admin')`.
 *
 *   GET   /api/v1/admin/settings?category=quiz  — list settings (all, or one category)
 *   GET   /api/v1/admin/settings/:category/:key  — read a single setting
 *   PATCH /api/v1/admin/settings/:category/:key  — partial-update a setting
 */

import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '@models/article.types.js';
import { AppError } from '@errors/AppError.js';
import {
  SETTING_CATEGORIES,
  SENSITIVE_SETTING_FIELDS,
  type SettingCategory,
} from '@models/settings.types.js';
import defaultSettingsService, {
  type SettingsService,
} from '@services/settingsService.js';

const isKnownCategory = (value: string | undefined): value is SettingCategory =>
  value !== undefined && (SETTING_CATEGORIES as readonly string[]).includes(value);

const MASK = '••••••••';

/**
 * Replaces sensitive fields (e.g. LLM API keys) with a mask before a setting
 * value leaves the API. The DB and internal service accessors always see the
 * real value — this only guards HTTP responses.
 * @param category The setting category (e.g. "quiz")
 * @param key The setting key (e.g. "llm")
 * @param value The setting value to mask
 * @returns The masked value, or the original value if not sensitive
 */
const maskSensitiveFields = (
  category: string,
  key: string,
  value: unknown
): unknown => {
  const sensitiveFields = SENSITIVE_SETTING_FIELDS[category as SettingCategory]?.[key];
  if (!sensitiveFields || typeof value !== 'object' || value === null) {
    return value;
  }

  const masked = { ...(value as Record<string, unknown>) };
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = MASK;
    }
  }
  return masked;
};

const maskCategoryValues = (
  category: string,
  values: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    result[key] = maskSensitiveFields(category, key, value);
  }
  return result;
};

/**
 * Creates the settings controller with an injected settings service so callers
 * can supply mocks (tests) or the production singleton (default export).
 */
export const createSettingsController = (
  settingsService: SettingsService = defaultSettingsService
) => {
  /** GET /api/v1/admin/settings[?category=quiz] */
  const list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const requestedCategory = req.query.category as string | undefined;

      if (requestedCategory !== undefined) {
        if (!isKnownCategory(requestedCategory)) {
          throw new AppError(`Unknown setting category: ${requestedCategory}`, 400);
        }
        const values = await settingsService.listByCategory(requestedCategory);
        res.status(200).json(
          successResponse(
            { [requestedCategory]: maskCategoryValues(requestedCategory, values) },
            'Settings retrieved successfully'
          )
        );
        return;
      }

      const data: Record<string, unknown> = {};
      for (const category of SETTING_CATEGORIES) {
        const values = await settingsService.listByCategory(category);
        data[category] = maskCategoryValues(category, values);
      }
      res.status(200).json(successResponse(data, 'Settings retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/v1/admin/settings/:category/:key */
  const getOne = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { category, key } = req.params;
      if (!isKnownCategory(category)) {
        throw new AppError(`Unknown setting category: ${category}`, 400);
      }

      const value = await settingsService.getSetting(category, key);
      res
        .status(200)
        .json(
          successResponse(
            maskSensitiveFields(category, key, value),
            'Setting retrieved successfully'
          )
        );
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /api/v1/admin/settings/:category/:key */
  const update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { category, key } = req.params;
      if (!isKnownCategory(category)) {
        throw new AppError(`Unknown setting category: ${category}`, 400);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const updatedBy = req.user!.userId;
      const value = await settingsService.updateSetting(
        category,
        key,
        (req.body ?? {}) as Record<string, unknown>,
        updatedBy
      );

      res
        .status(200)
        .json(
          successResponse(
            maskSensitiveFields(category, key, value),
            'Setting updated successfully'
          )
        );
    } catch (error) {
      next(error);
    }
  };

  return { list, getOne, update };
};

export default createSettingsController();
