import path from 'path';
import fs from 'fs';
import { executeQuery } from '../database/mysqlConfig.js';

export const KYC_SUPPORT_PHONE_DISPLAY = '(475) 259-8768';
export const KYC_SUPPORT_PHONE_LINK = 'tel:+14752598768';

export type KycClientStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'failed'
  | 'manual_review';

export type KycRecordStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'failed'
  | 'manual_review';

export type KycAuditEvent = 'triggered' | 'started' | 'status_changed' | 'completed';

export const KYC_REQUIRED_RESPONSE = {
  success: false,
  code: 'KYC_REQUIRED',
  error: 'Identity Verification Required',
  message: 'To protect consumer information and maintain platform security, identity verification is required before you can add or manage additional client profiles. Please complete verification to continue.',
  verification_url: '/api/kyc/me',
} as const;

let ensuredSchema = false;

async function columnExists(tableName: string, columnName: string) {
  const rows = await executeQuery<any[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );

  return Number(rows?.[0]?.count || 0) > 0;
}

async function triggerExists(triggerName: string) {
  const rows = await executeQuery<any[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.TRIGGERS
     WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?`,
    [triggerName],
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

export async function ensureKycSchema() {
  if (ensuredSchema) {
    return;
  }

  const hasKycRequired = await columnExists('users', 'kyc_required');
  if (!hasKycRequired) {
    await executeQuery(
      `ALTER TABLE users
       ADD COLUMN kyc_required TINYINT(1) NOT NULL DEFAULT 0`,
    );
  }

  const hasKycStatus = await columnExists('users', 'kyc_status');
  if (!hasKycStatus) {
    await executeQuery(
      `ALTER TABLE users
       ADD COLUMN kyc_status VARCHAR(32) NOT NULL DEFAULT 'not_started'`,
    );
  }
  const hasKycExempt = await columnExists('users', 'kyc_exempt');
  if (!hasKycExempt) {
    await executeQuery(
      `ALTER TABLE users
       ADD COLUMN kyc_exempt TINYINT(1) NOT NULL DEFAULT 0`,
    );
  }
  await executeQuery(`ALTER TABLE users MODIFY COLUMN kyc_required TINYINT(1) NOT NULL DEFAULT 0`);
  await executeQuery(`ALTER TABLE users MODIFY COLUMN kyc_status VARCHAR(32) NOT NULL DEFAULT 'not_started'`);
  await executeQuery(`ALTER TABLE users MODIFY COLUMN kyc_exempt TINYINT(1) NOT NULL DEFAULT 0`);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS kyc_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      image_url TEXT NULL,
      image_path TEXT NULL,
      mime_type VARCHAR(120) NULL,
      status ENUM('not_started', 'pending', 'approved', 'failed', 'manual_review', 'not_submitted', 'resubmit_required', 'rejected') NOT NULL DEFAULT 'not_started',
      provider_reference_id VARCHAR(255) NULL,
      triggered_at DATETIME NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      admin_notes TEXT NULL,
      reviewed_by INT NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_kyc_user_id (user_id),
      INDEX idx_kyc_status (status),
      INDEX idx_kyc_reviewed_by (reviewed_by)
    )
  `);

  // Retain legacy enum values while migrating existing rows so deployments can
  // upgrade without invalidating previously approved verification records.
  await executeQuery(`
    ALTER TABLE kyc_verifications
    MODIFY COLUMN status ENUM('not_started', 'pending', 'approved', 'failed', 'manual_review', 'not_submitted', 'resubmit_required', 'rejected')
      NOT NULL DEFAULT 'not_started'
  `);

  const verificationColumns: Array<[string, string]> = [
    ['provider_reference_id', 'VARCHAR(255) NULL'],
    ['triggered_at', 'DATETIME NULL'],
    ['started_at', 'DATETIME NULL'],
    ['completed_at', 'DATETIME NULL'],
  ];
  for (const [column, definition] of verificationColumns) {
    if (!(await columnExists('kyc_verifications', column))) {
      await executeQuery(`ALTER TABLE kyc_verifications ADD COLUMN ${column} ${definition}`);
    }
  }

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS kyc_audit_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      verification_id INT NULL,
      event_type VARCHAR(32) NOT NULL,
      kyc_status VARCHAR(32) NOT NULL,
      provider_reference_id VARCHAR(255) NULL,
      ip_address VARCHAR(64) NULL,
      user_agent TEXT NULL,
      event_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata JSON NULL,
      INDEX idx_kyc_audit_user_id (user_id),
      INDEX idx_kyc_audit_event_at (event_at),
      INDEX idx_kyc_audit_status (kyc_status)
    )
  `);

  await executeQuery(
    `UPDATE users
     SET kyc_required = COALESCE(kyc_required, 0),
         kyc_exempt = COALESCE(kyc_exempt, 0),
         kyc_status = CASE
           WHEN kyc_status = 'approved' THEN 'approved'
           WHEN kyc_status IN ('resubmit_required', 'rejected') THEN 'failed'
           WHEN kyc_status = 'pending' THEN 'pending'
           ELSE 'not_started'
         END
     WHERE kyc_required IS NULL
        OR kyc_exempt IS NULL
        OR kyc_status IS NULL
        OR kyc_status = ''
        OR kyc_status IN ('not_required', 'not_submitted', 'resubmit_required', 'rejected')`,
  );

  await executeQuery(`UPDATE kyc_verifications SET status = 'not_started' WHERE status = 'not_submitted'`);
  await executeQuery(`UPDATE kyc_verifications SET status = 'failed' WHERE status IN ('resubmit_required', 'rejected')`);
  await executeQuery(`
    UPDATE users u
    JOIN kyc_verifications kv ON kv.user_id = u.id AND kv.status = 'approved'
    SET u.kyc_required = 1, u.kyc_status = 'approved'
    WHERE u.kyc_status <> 'approved'
  `);

  // Last-line protection for endpoints, integrations, team workflows, and
  // future features that may insert a client without calling the application
  // guard. Locking the owner row also serializes simultaneous first-client
  // requests so two parallel calls cannot both bypass the one-profile limit.
  if (await triggerExists('before_clients_insert_require_kyc')) {
    await executeQuery(`DROP TRIGGER IF EXISTS before_clients_insert_require_kyc`);
  }
  await executeQuery(`
    CREATE TRIGGER before_clients_insert_require_kyc
    BEFORE INSERT ON clients
    FOR EACH ROW
    BEGIN
      DECLARE owner_kyc_status VARCHAR(32) DEFAULT 'not_started';
      DECLARE owner_kyc_exempt TINYINT(1) DEFAULT 0;
      DECLARE existing_client_count INT DEFAULT 0;
      SELECT COALESCE(kyc_status, 'not_started'), COALESCE(kyc_exempt, 0)
        INTO owner_kyc_status, owner_kyc_exempt
        FROM users WHERE id = NEW.user_id FOR UPDATE;
      IF owner_kyc_exempt <> 1 AND owner_kyc_status <> 'approved' THEN
        SELECT COUNT(*) INTO existing_client_count FROM clients WHERE user_id = NEW.user_id;
        IF existing_client_count >= 1 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'KYC_REQUIRED';
        END IF;
      END IF;
    END
  `);

  ensuredSchema = true;
}

export async function getUserKycState(userId: number) {
  await ensureKycSchema();

  const users = await executeQuery<any[]>(
    `SELECT id, email, first_name, last_name, role, kyc_required, kyc_status, kyc_exempt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }

  const user = users[0];
  const clientRows = await executeQuery<any[]>(
    `SELECT COUNT(*) AS client_count
     FROM clients
     WHERE user_id = ?`,
    [userId],
  );
  const latestRows = await executeQuery<any[]>(
    `SELECT id, user_id, image_url, status, admin_notes, reviewed_by, reviewed_at,
            provider_reference_id, triggered_at, started_at, completed_at, created_at, updated_at
     FROM kyc_verifications
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [userId],
  );

  return {
    user,
    clientCount: Number(clientRows?.[0]?.client_count || 0),
    latestVerification: Array.isArray(latestRows) && latestRows.length > 0 ? latestRows[0] : null,
  };
}

export async function markUserKycRequired(userId: number, required: boolean, status: KycClientStatus) {
  await ensureKycSchema();
  await executeQuery(
    `UPDATE users
     SET kyc_required = ?, kyc_status = ?, updated_at = NOW()
     WHERE id = ?`,
    [required ? 1 : 0, status, userId],
  );
}

export async function setUserKycExempt(userId: number, exempt: boolean, status?: KycClientStatus) {
  await ensureKycSchema();
  await executeQuery(
    `UPDATE users
     SET kyc_exempt = ?,
         kyc_required = ?,
         kyc_status = COALESCE(?, kyc_status),
         updated_at = NOW()
     WHERE id = ?`,
    [exempt ? 1 : 0, exempt ? 0 : 1, status || null, userId],
  );
}

export async function logKycAuditEvent(input: {
  userId: number;
  status: KycClientStatus;
  eventType: KycAuditEvent;
  verificationId?: number | null;
  providerReferenceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await ensureKycSchema();
  await executeQuery(
    `INSERT INTO kyc_audit_events (
       user_id, verification_id, event_type, kyc_status, provider_reference_id,
       ip_address, user_agent, event_at, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      input.userId,
      input.verificationId || null,
      input.eventType,
      input.status,
      input.providerReferenceId || null,
      input.ipAddress || null,
      input.userAgent || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

export async function checkClientCreationKyc(input: {
  userId: number;
  source: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await ensureKycSchema();

  const rows = await executeQuery<any[]>(
    `SELECT u.kyc_status, COALESCE(u.kyc_exempt, 0) AS kyc_exempt, COUNT(c.id) AS client_count,
            (SELECT kv.id FROM kyc_verifications kv WHERE kv.user_id = u.id ORDER BY kv.id DESC LIMIT 1) AS verification_id
     FROM users u
     LEFT JOIN clients c ON c.user_id = u.id
     WHERE u.id = ?
     GROUP BY u.id, u.kyc_status, u.kyc_exempt
     LIMIT 1`,
    [input.userId],
  );
  const row = rows?.[0];
  if (!row) {
    return { allowed: false, code: 'USER_NOT_FOUND', status: 'not_started' as KycClientStatus, clientCount: 0 };
  }

  const status = String(row.kyc_status || 'not_started') as KycClientStatus;
  const exempt = Number(row.kyc_exempt || 0) === 1;
  const clientCount = Number(row.client_count || 0);
  if (exempt || status === 'approved' || clientCount === 0) {
    return { allowed: true, code: 'KYC_OK', status, clientCount };
  }

  // Existing users keep all current clients. Triggering only blocks creation of
  // another record and never changes access to records they already own.
  if (status === 'not_started') {
    await markUserKycRequired(input.userId, true, 'not_started');
  }
  let verificationId = Number(row.verification_id || 0);
  if (!verificationId) {
    const result: any = await executeQuery(
      `INSERT INTO kyc_verifications (user_id, status, triggered_at, created_at, updated_at)
       VALUES (?, 'not_started', NOW(), NOW(), NOW())`,
      [input.userId],
    );
    verificationId = Number(result?.insertId || 0);
  } else {
    await executeQuery(
      `UPDATE kyc_verifications SET triggered_at = COALESCE(triggered_at, NOW()) WHERE id = ?`,
      [verificationId],
    );
  }
  await logKycAuditEvent({
    userId: input.userId,
    verificationId,
    status,
    eventType: 'triggered',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { source: input.source, existing_client_count: clientCount },
  });

  return { allowed: false, code: 'KYC_REQUIRED', status, clientCount };
}

export function isKycDatabaseRejection(error: unknown) {
  const value = error as any;
  return String(value?.message || value?.sqlMessage || '').includes('KYC_REQUIRED');
}

export async function assertUserCanCheckout(userId: number) {
  const state = await getUserKycState(userId);

  if (!state) {
    return {
      allowed: false,
      code: 'USER_NOT_FOUND',
      status: 'not_started' as KycClientStatus,
      message: 'User not found.',
    };
  }

  const kycStatus = String(state.user?.kyc_status || 'not_started') as KycClientStatus;
  return {
    allowed: true,
    code: 'KYC_NOT_REQUIRED_FOR_CHECKOUT',
    status: kycStatus,
    message: 'KYC is not required for subscription checkout.',
  };
}

export function ensureKycUploadDirectory() {
  const uploadDir = path.resolve(process.cwd(), 'uploads/kyc');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}
