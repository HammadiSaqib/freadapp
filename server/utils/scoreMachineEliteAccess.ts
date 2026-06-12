import { getDatabaseAdapter } from '../database/databaseAdapter.js';

const SCORE_MACHINE_ELITE_PERMISSION = 'score_machine_elite';
const SCORE_MACHINE_BASIC_PERMISSION = 'score_machine_basic';
const SCORE_MACHINE_ELITE_PAGE = 'score-machine-elite';
const SCORE_MACHINE_BASIC_PAGE = 'score-machine-basic';

export type ScoreMachinePortalMode = 'standard' | 'basic' | 'elite';

export interface ScoreMachineEliteAccessStatus {
  hasAccess: boolean;
  hasDirectPermission: boolean;
  hasPlanPermission: boolean;
  effectiveAdminUserId: number;
}

export interface ScoreMachinePortalAccessStatus {
  portalMode: ScoreMachinePortalMode;
  hasBasicAccess: boolean;
  hasEliteAccess: boolean;
  hasDirectBasicPermission: boolean;
  hasDirectElitePermission: boolean;
  hasPlanBasicAccess: boolean;
  hasPlanEliteAccess: boolean;
  hasAnyActivePlans: boolean;
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

const getActivePlanPermissionSets = async (effectiveAdminUserId: number): Promise<string[][]> => {
  const adapter = getDatabaseAdapter();
  const permissionSets: string[][] = [];

  try {
    const activeSubscriptions = await adapter.allQuery(
      `SELECT sp.page_permissions
       FROM subscriptions s
       LEFT JOIN subscription_plans sp ON LOWER(TRIM(sp.name)) = LOWER(TRIM(s.plan_name))
       WHERE s.user_id = ? AND LOWER(TRIM(s.status)) = 'active'
       ORDER BY s.created_at DESC`,
      [effectiveAdminUserId]
    );

    permissionSets.push(
      ...activeSubscriptions.map((subscription) => parseStringArray(subscription?.page_permissions))
    );
  } catch (subscriptionError) {
    console.warn('Failed to read subscriptions while checking The Capsol portal access:', subscriptionError);
  }

  try {
    const adminSubscriptions = await adapter.allQuery(
      `SELECT sp.page_permissions
       FROM admin_subscriptions asub
       JOIN admin_profiles ap ON ap.id = asub.admin_id
       JOIN subscription_plans sp ON sp.id = asub.plan_id
       WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active'
       ORDER BY asub.created_at DESC`,
      [effectiveAdminUserId]
    );

    permissionSets.push(
      ...adminSubscriptions.map((subscription) => parseStringArray(subscription?.page_permissions))
    );
  } catch (adminSubscriptionError) {
    console.warn('Failed to read admin_subscriptions while checking The Capsol portal access:', adminSubscriptionError);
  }

  return permissionSets;
};

export const getScoreMachinePortalAccessStatus = async (userId: number): Promise<ScoreMachinePortalAccessStatus> => {
  const adapter = getDatabaseAdapter();
  const effectiveAdminUserId = await resolveScoreMachineEliteAdminUserId(userId);

  const adminProfile = await adapter.getQuery(
    'SELECT permissions FROM admin_profiles WHERE user_id = ? LIMIT 1',
    [effectiveAdminUserId]
  );
  const adminPermissions = parseStringArray(adminProfile?.permissions);
  const hasDirectElitePermission = adminPermissions.includes(SCORE_MACHINE_ELITE_PERMISSION);
  const hasDirectBasicPermission = !hasDirectElitePermission && adminPermissions.includes(SCORE_MACHINE_BASIC_PERMISSION);

  const planPermissionSets = await getActivePlanPermissionSets(effectiveAdminUserId);
  const hasAnyActivePlans = planPermissionSets.length > 0;
  const hasPlanEliteAccess = planPermissionSets.some((permissions) => permissions.includes(SCORE_MACHINE_ELITE_PAGE));
  const hasPlanBasicAccess = hasAnyActivePlans && planPermissionSets.every(
    (permissions) => permissions.includes(SCORE_MACHINE_BASIC_PAGE) && !permissions.includes(SCORE_MACHINE_ELITE_PAGE)
  );

  let portalMode: ScoreMachinePortalMode = 'standard';

  if (hasDirectElitePermission) {
    portalMode = 'elite';
  } else if (hasDirectBasicPermission) {
    portalMode = 'basic';
  } else if (hasPlanBasicAccess) {
    portalMode = 'basic';
  } else if (hasPlanEliteAccess) {
    portalMode = 'elite';
  }

  return {
    portalMode,
    hasBasicAccess: portalMode === 'basic',
    hasEliteAccess: portalMode === 'elite',
    hasDirectBasicPermission,
    hasDirectElitePermission,
    hasPlanBasicAccess,
    hasPlanEliteAccess,
    hasAnyActivePlans,
    effectiveAdminUserId,
  };
};

export const getScoreMachineEliteAccessStatus = async (userId: number): Promise<ScoreMachineEliteAccessStatus> => {
  const portalAccess = await getScoreMachinePortalAccessStatus(userId);

  return {
    hasAccess: portalAccess.hasEliteAccess,
    hasDirectPermission: portalAccess.hasDirectElitePermission,
    hasPlanPermission: portalAccess.hasPlanEliteAccess,
    effectiveAdminUserId: portalAccess.effectiveAdminUserId,
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