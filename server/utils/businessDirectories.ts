import { DatabaseAdapter } from '../database/databaseAdapter.js';

export type BusinessDirectoryStatus = 'pending' | 'approved' | 'rejected';

export interface BusinessDirectoryRecord {
  id: number;
  business_name: string;
  business_email: string;
  business_phone_number: string;
  business_address: string;
  description: string;
  logo_url: string | null;
  status: BusinessDirectoryStatus;
  approved_at: string | null;
  approved_by: number | null;
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

function normalizeBusinessDirectoryStatus(value: unknown): BusinessDirectoryStatus {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'approved' || normalized === 'rejected') {
    return normalized;
  }

  return 'approved';
}

export function normalizeBusinessDirectory(row: any): BusinessDirectoryRecord {
  return {
    id: Number(row?.id || 0),
    business_name: String(row?.business_name || ''),
    business_email: String(row?.business_email || ''),
    business_phone_number: String(row?.business_phone_number || ''),
    business_address: String(row?.business_address || ''),
    description: String(row?.description || ''),
    logo_url: row?.logo_url ? String(row.logo_url) : null,
    status: normalizeBusinessDirectoryStatus(row?.status),
    approved_at: row?.approved_at ? String(row.approved_at) : null,
    approved_by: toNullableNumber(row?.approved_by),
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    created_by: toNullableNumber(row?.created_by),
    updated_by: toNullableNumber(row?.updated_by),
  };
}

async function ensureBusinessDirectoriesColumns(db: DatabaseAdapter | any): Promise<void> {
  if (db.getType() === 'sqlite') {
    const sqliteColumns = await db.allQuery('PRAGMA table_info(business_directories)');
    const columnNames = new Set((sqliteColumns || []).map((column: any) => String(column?.name || '').toLowerCase()));

    if (!columnNames.has('status')) {
      await db.executeQuery("ALTER TABLE business_directories ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'");
    }
    if (!columnNames.has('approved_at')) {
      await db.executeQuery('ALTER TABLE business_directories ADD COLUMN approved_at DATETIME DEFAULT NULL');
    }
    if (!columnNames.has('approved_by')) {
      await db.executeQuery('ALTER TABLE business_directories ADD COLUMN approved_by INTEGER DEFAULT NULL');
    }
    if (!columnNames.has('description')) {
      await db.executeQuery("ALTER TABLE business_directories ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    }

    return;
  }

  const mysqlColumns = await db.allQuery('SHOW COLUMNS FROM business_directories');
  const columnNames = new Set((mysqlColumns || []).map((column: any) => String(column?.Field || column?.field || '').toLowerCase()));

  if (!columnNames.has('status')) {
    await db.executeQuery("ALTER TABLE business_directories ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved'");
  }
  if (!columnNames.has('approved_at')) {
    await db.executeQuery('ALTER TABLE business_directories ADD COLUMN approved_at DATETIME NULL DEFAULT NULL');
  }
  if (!columnNames.has('approved_by')) {
    await db.executeQuery('ALTER TABLE business_directories ADD COLUMN approved_by INT NULL DEFAULT NULL');
  }
  if (!columnNames.has('description')) {
    await db.executeQuery('ALTER TABLE business_directories ADD COLUMN description TEXT NULL');
  }
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
        description TEXT NOT NULL DEFAULT '',
        logo_url TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        approved_at DATETIME DEFAULT NULL,
        approved_by INTEGER DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER DEFAULT NULL,
        updated_by INTEGER DEFAULT NULL
      )`
    );
    await ensureBusinessDirectoriesColumns(db);
    return;
  }

  await db.executeQuery(
    `CREATE TABLE IF NOT EXISTS business_directories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_name VARCHAR(255) NOT NULL,
      business_email VARCHAR(255) NOT NULL,
      business_phone_number VARCHAR(50) NOT NULL,
      business_address TEXT NOT NULL,
      description TEXT NULL,
      logo_url TEXT DEFAULT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
      approved_at DATETIME NULL DEFAULT NULL,
      approved_by INT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT DEFAULT NULL,
      updated_by INT DEFAULT NULL,
      INDEX idx_business_directories_status (status),
      INDEX idx_business_directories_name (business_name),
      INDEX idx_business_directories_email (business_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await ensureBusinessDirectoriesColumns(db);
}

export interface ListBusinessDirectoriesOptions {
  statuses?: BusinessDirectoryStatus[];
  createdBy?: number | null;
}

function normalizeStatuses(statuses: BusinessDirectoryStatus[] | undefined): BusinessDirectoryStatus[] {
  if (!Array.isArray(statuses)) {
    return [];
  }

  const allowed: BusinessDirectoryStatus[] = ['pending', 'approved', 'rejected'];
  const normalized = statuses
    .map((status) => normalizeBusinessDirectoryStatus(status))
    .filter((status, index, values) => values.indexOf(status) === index && allowed.includes(status));

  return normalized;
}

export async function listBusinessDirectories(
  db: DatabaseAdapter | any,
  options: ListBusinessDirectoriesOptions = {},
): Promise<BusinessDirectoryRecord[]> {
  await ensureBusinessDirectoriesTable(db);

  const whereClauses: string[] = [];
  const params: any[] = [];

  const statuses = normalizeStatuses(options.statuses);
  if (statuses.length > 0) {
    whereClauses.push(`COALESCE(status, 'approved') IN (${statuses.map(() => '?').join(', ')})`);
    params.push(...statuses);
  }

  const createdBy = toNullableNumber(options.createdBy);
  if (createdBy !== null) {
    whereClauses.push('created_by = ?');
    params.push(createdBy);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const rows = await db.allQuery(
    `SELECT
       id,
       business_name,
       business_email,
       business_phone_number,
       business_address,
       description,
       logo_url,
       COALESCE(status, 'approved') AS status,
       approved_at,
       approved_by,
       created_at,
       updated_at,
       created_by,
       updated_by
     FROM business_directories
     ${whereClause}
     ORDER BY business_name ASC, id DESC`
    ,
    params,
  );
  return (rows || []).map(normalizeBusinessDirectory);
}

export async function getBusinessDirectoryById(
  db: DatabaseAdapter | any,
  id: number,
): Promise<BusinessDirectoryRecord | null> {
  await ensureBusinessDirectoriesTable(db);
  const row = await db.getQuery(
    `SELECT
       id,
       business_name,
       business_email,
       business_phone_number,
       business_address,
       description,
       logo_url,
       COALESCE(status, 'approved') AS status,
       approved_at,
       approved_by,
       created_at,
       updated_at,
       created_by,
       updated_by
     FROM business_directories
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return row ? normalizeBusinessDirectory(row) : null;
}
