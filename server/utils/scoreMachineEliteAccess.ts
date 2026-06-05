import { getDatabaseAdapter } from '../database/databaseAdapter.js';

export interface ScoreMachineEliteAccessStatus {
  hasAccess: boolean;
  hasDirectPermission: boolean;
  hasPlanPermission: boolean;
  effectiveAdminUserId: number;
}

export const resolveScoreMachineEliteAdminUserId = async (userId: number): Promise<number> => {
  const adapter = getDatabaseAdapter();
  const employeeLink = await adapter.getQuery(
    'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
    [userId, 'active']
  );

  if (employeeLink?.admin_id) {
    return Number(employeeLink.admin_id);
  }

  return userId;
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === 'string');
      }
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { pages?: unknown }).pages)) {
        return ((parsed as { pages: unknown[] }).pages).filter((entry): entry is string => typeof entry === 'string');
      }
    } catch {
      return [];
    }
  }

  if (value && typeof value === 'object' && Array.isArray((value as { pages?: unknown }).pages)) {
    return ((value as { pages: unknown[] }).pages).filter((entry): entry is string => typeof entry === 'string');
  }

  return [];
};

export const getScoreMachineEliteAccessStatus = async (userId: number): Promise<ScoreMachineEliteAccessStatus> => {
  const adapter = getDatabaseAdapter();
  const effectiveAdminUserId = await resolveScoreMachineEliteAdminUserId(userId);

  const adminProfile = await adapter.getQuery(
    'SELECT permissions FROM admin_profiles WHERE user_id = ? LIMIT 1',
    [effectiveAdminUserId]
  );
  const adminPermissions = parseStringArray(adminProfile?.permissions);
  const hasDirectPermission = adminPermissions.includes('score_machine_elite');

  if (hasDirectPermission) {
    return {
      hasAccess: true,
      hasDirectPermission: true,
      hasPlanPermission: false,
      effectiveAdminUserId,
    };
  }

  let planPagePermissions: string[] = [];

  try {
    const activeSubscription = await adapter.getQuery(
      `SELECT sp.page_permissions
       FROM subscriptions s
       LEFT JOIN subscription_plans sp ON LOWER(TRIM(sp.name)) = LOWER(TRIM(s.plan_name))
       WHERE s.user_id = ? AND LOWER(TRIM(s.status)) = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [effectiveAdminUserId]
    );

    planPagePermissions = parseStringArray(activeSubscription?.page_permissions);
  } catch (subscriptionError) {
    console.warn('Failed to read subscriptions while checking Score Machine Elite access:', subscriptionError);
  }

  if (planPagePermissions.length === 0) {
    try {
      const adminSubscription = await adapter.getQuery(
        `SELECT sp.page_permissions
         FROM admin_subscriptions asub
         JOIN admin_profiles ap ON ap.id = asub.admin_id
         JOIN subscription_plans sp ON sp.id = asub.plan_id
         WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active'
         ORDER BY asub.created_at DESC
         LIMIT 1`,
        [effectiveAdminUserId]
      );

      planPagePermissions = parseStringArray(adminSubscription?.page_permissions);
    } catch (adminSubscriptionError) {
      console.warn('Failed to read admin_subscriptions while checking Score Machine Elite access:', adminSubscriptionError);
    }
  }

  const hasPlanPermission = planPagePermissions.includes('score-machine-elite');

  return {
    hasAccess: hasPlanPermission,
    hasDirectPermission,
    hasPlanPermission,
    effectiveAdminUserId,
  };
};

export const getLatestActiveTsmEliteTemplate = async () => {
  const adapter = getDatabaseAdapter();
  return adapter.getQuery(
    `SELECT id, admin_id, name, description, content_html, content_text, status, created_at, updated_at
     FROM tsm_elite
     WHERE status = 'active'
     ORDER BY updated_at DESC, created_at DESC, id DESC
     LIMIT 1`
  );
};

export const hasSignedScoreMachineEliteAgreement = async (userId: number): Promise<boolean> => {
  const adapter = getDatabaseAdapter();
  const effectiveAdminUserId = await resolveScoreMachineEliteAdminUserId(userId);
  const template = await getLatestActiveTsmEliteTemplate();

  if (!template?.id) {
    return false;
  }

  const signature = await adapter.getQuery(
    `SELECT id
     FROM tsm_elite_signatures
     WHERE admin_id = ?
       AND template_id = ?
       AND signature_image_url IS NOT NULL
       AND TRIM(signature_image_url) <> ''
     ORDER BY signed_at DESC, id DESC
     LIMIT 1`,
    [effectiveAdminUserId, template.id]
  );

  return Boolean(signature?.id);
};