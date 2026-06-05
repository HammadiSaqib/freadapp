import { DatabaseAdapter } from '../database/databaseAdapter.js';

export interface BusinessDirectoryRecord {
  id: number;
  business_name: string;
  business_email: string;
  business_phone_number: string;
  business_address: string;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: number | null;
  updated_by: number | null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeBusinessDirectory(row: any): BusinessDirectoryRecord {
  return {
    id: Number(row?.id || 0),
    business_name: String(row?.business_name || ''),
    business_email: String(row?.business_email || ''),
    business_phone_number: String(row?.business_phone_number || ''),
    business_address: String(row?.business_address || ''),
    logo_url: row?.logo_url ? String(row.logo_url) : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    created_by: toNullableNumber(row?.created_by),
    updated_by: toNullableNumber(row?.updated_by),
  };
}

export async function ensureBusinessDirectoriesTable(db: DatabaseAdapter | any): Promise<void> {
  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `CREATE TABLE IF NOT EXISTS business_directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_name TEXT NOT NULL,
        business_email TEXT NOT NULL,
        business_phone_number TEXT NOT NULL,
        business_address TEXT NOT NULL,
        logo_url TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER DEFAULT NULL,
        updated_by INTEGER DEFAULT NULL
      )`
    );
    return;
  }

  await db.executeQuery(
    `CREATE TABLE IF NOT EXISTS business_directories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_name VARCHAR(255) NOT NULL,
      business_email VARCHAR(255) NOT NULL,
      business_phone_number VARCHAR(50) NOT NULL,
      business_address TEXT NOT NULL,
      logo_url TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT DEFAULT NULL,
      updated_by INT DEFAULT NULL,
      INDEX idx_business_directories_name (business_name),
      INDEX idx_business_directories_email (business_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function listBusinessDirectories(db: DatabaseAdapter | any): Promise<BusinessDirectoryRecord[]> {
  await ensureBusinessDirectoriesTable(db);
  const rows = await db.allQuery(
    `SELECT *
     FROM business_directories
     ORDER BY business_name ASC, id DESC`
  );
  return (rows || []).map(normalizeBusinessDirectory);
}

export async function getBusinessDirectoryById(
  db: DatabaseAdapter | any,
  id: number,
): Promise<BusinessDirectoryRecord | null> {
  await ensureBusinessDirectoriesTable(db);
  const row = await db.getQuery(
    `SELECT *
     FROM business_directories
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return row ? normalizeBusinessDirectory(row) : null;
}