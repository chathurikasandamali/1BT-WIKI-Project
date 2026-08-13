/**
 * Repository for the app_settings key-value store.
 *
 * Follows the pattern of the other repositories (e.g. notificationRepository):
 * thin Prisma access with DB failures translated to AppError(503). The `value`
 * column is JSONB; row-level typing lives in the settings service / types.
 */

import { prisma } from '@repo/db';
import { AppError } from '@errors/AppError.js';
import type { Prisma } from '@repo/db';
import type { SettingCategory } from '@models/settings.types.js';

/** A stored setting row (camelCase domain shape). */
export interface SettingRecord {
  key: string;
  category: SettingCategory;
  value: Record<string, unknown>;
  updatedBy: string | null;
  updatedAt: Date;
}

const SETTING_SELECT = {
  key: true,
  category: true,
  value: true,
  updatedBy: true,
  updatedAt: true,
} as const;

const toRecord = (row: unknown): SettingRecord => {
  const r = row as {
    key: string;
    category: SettingCategory;
    value: unknown;
    updatedBy: string | null;
    updatedAt: Date;
  };

  return {
    key: r.key,
    category: r.category,
    value: (r.value as Record<string, unknown>) ?? {},
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt,
  };
};

/** Fetch a single setting row by its unique key. */
const findByKey = async (key: string): Promise<SettingRecord | null> => {
  try {
    const row = await prisma.appSettings.findUnique({
      where: { key },
      select: SETTING_SELECT,
    });
    return row ? toRecord(row) : null;
  } catch (error) {
    console.error('Error fetching setting by key:', error);
    throw new AppError('Database is unavailable', 503);
  }
};

/** Fetch every setting row in a category (empty array when none exist). */
const findByCategory = async (
  category: SettingCategory
): Promise<SettingRecord[]> => {
  try {
    const rows = await prisma.appSettings.findMany({
      where: { category },
      orderBy: { key: 'asc' },
      select: SETTING_SELECT,
    });
    return rows.map(toRecord);
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    throw new AppError('Database is unavailable', 503);
  }
};

/** Create or update a setting row (key is the primary key). */
const upsert = async (
  key: string,
  category: SettingCategory,
  value: Record<string, unknown>,
  updatedBy: string | null
): Promise<SettingRecord> => {
  try {
    const row = await prisma.appSettings.upsert({
      where: { key },
      update: {
        category,
        value: value as Prisma.InputJsonValue,
        updatedBy,
      },
      create: {
        key,
        category,
        value: value as Prisma.InputJsonValue,
        updatedBy,
      },
      select: SETTING_SELECT,
    });
    return toRecord(row);
  } catch (error) {
    console.error('Error upserting setting:', error);
    throw new AppError('Database is unavailable', 503);
  }
};

export default { findByKey, findByCategory, upsert };
