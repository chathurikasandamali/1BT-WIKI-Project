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
import { SENSITIVE_SETTING_FIELDS, type SettingCategory } from '@models/settings.types.js';
import { encrypt, decrypt } from '@v1/lib/crypto/secretCipher.js';

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

/** Field names (if any) that must be encrypted at rest for a given (category, key). */
const sensitiveFieldsFor = (category: SettingCategory, key: string): readonly string[] =>
  SENSITIVE_SETTING_FIELDS[category]?.[key] ?? [];

/** Applies `transform` to each sensitive field present (and non-empty) in `value`. */
const transformSensitiveFields = (
  category: SettingCategory,
  key: string,
  value: Record<string, unknown>,
  transform: (raw: string) => string
): Record<string, unknown> => {
  const fields = sensitiveFieldsFor(category, key);
  if (fields.length === 0) {
    return value;
  }

  const result = { ...value };
  for (const field of fields) {
    const raw = result[field];
    if (typeof raw === 'string' && raw.length > 0) {
      result[field] = transform(raw);
    }
  }
  return result;
};

const toRecord = (row: unknown): SettingRecord => {
  const r = row as {
    key: string;
    category: SettingCategory;
    value: unknown;
    updatedBy: string | null;
    updatedAt: Date;
  };

  const value = (r.value as Record<string, unknown>) ?? {};

  return {
    key: r.key,
    category: r.category,
    value: transformSensitiveFields(r.category, r.key, value, decrypt),
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
    const encryptedValue = transformSensitiveFields(category, key, value, encrypt);
    const row = await prisma.appSettings.upsert({
      where: { key },
      update: {
        category,
        value: encryptedValue as Prisma.InputJsonValue,
        updatedBy,
      },
      create: {
        key,
        category,
        value: encryptedValue as Prisma.InputJsonValue,
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
