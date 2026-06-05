import { getQuery } from '../database/databaseAdapter.js';

export interface PlanLimits {
  hasActivePlan: boolean;
  maxClients: number;
  currentClientCount: number;
  canAddClient: boolean;
  planName?: string;
  planStatus?: string;
}

async function resolvePlanUserId(userId: number): Promise<number> {
  const employeeLink = await getQuery(
    'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
    [userId, 'active']
  );
  if (employeeLink?.admin_id) {
    return Number(employeeLink.admin_id);
  }
  return userId;
}

/**
 * Check user's active plan and client limits
 * @param userId - The user ID to check
 * @returns PlanLimits object with plan information and validation status
 */
export async function checkUserPlanLimits(userId: number): Promise<PlanLimits> {
  let effectiveUserId = userId;
  try {
    // First, get the user's current client count
    effectiveUserId = await resolvePlanUserId(userId);
    const clientCountResult = await getQuery(
      'SELECT COUNT(*) as count FROM clients WHERE user_id = ?',
      [effectiveUserId]
    );
    
    const currentClientCount = clientCountResult?.count || 0;

    // Check if admin has a subscription exemption permission
    // This allows unlimited clients and bypasses subscription requirements
    const adminProfile = await getQuery(
      'SELECT permissions FROM admin_profiles WHERE user_id = ?',
      [effectiveUserId]
    );
    try {
      const rawPermissions = adminProfile?.permissions;
      const permissions = rawPermissions
        ? (typeof rawPermissions === 'string' ? JSON.parse(rawPermissions) : rawPermissions)
        : [];
      if (Array.isArray(permissions) && (permissions.includes('subscription_exempt') || permissions.includes('no_subscription_required'))) {
        return {
          hasActivePlan: true,
          maxClients: Number.MAX_SAFE_INTEGER,
          currentClientCount,
          canAddClient: true,
          planName: 'Admin Exempt',
          planStatus: 'exempt'
        };
      }
    } catch (permError) {
      console.warn('Plan validation: failed to parse admin permissions for exemption', permError);
    }

    // Check if user has an active subscription
    const activeSubscription = await getQuery(`
      SELECT 
        s.status,
        s.plan_name,
        sp.max_clients,
        sp.name as subscription_plan_name
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON sp.name = s.plan_name
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [effectiveUserId]);

    // If no active subscription found, check admin_subscriptions table
    let adminSubscription = null;
    if (!activeSubscription) {
      adminSubscription = await getQuery(`
        SELECT 
          asub.status,
          asub.billing_cycle,
          sp.name as plan_name,
          sp.max_clients
        FROM admin_subscriptions asub
        JOIN admin_profiles ap ON ap.id = asub.admin_id
        JOIN subscription_plans sp ON sp.id = asub.plan_id
        WHERE ap.user_id = ? AND asub.status = 'active'
        ORDER BY asub.created_at DESC
        LIMIT 1
      `, [effectiveUserId]);
    }

    const subscription = activeSubscription || adminSubscription;

    if (!subscription) {
      // Check if user has an active affiliate trial
      const trialRow = await getQuery(
        `SELECT trial_max_clients FROM users WHERE id = ? AND trial_expires_at IS NOT NULL AND trial_expires_at > NOW() LIMIT 1`,
        [effectiveUserId]
      );
      if (trialRow) {
        const trialMaxClients = trialRow.trial_max_clients != null ? Number(trialRow.trial_max_clients) : Number.MAX_SAFE_INTEGER;
        return {
          hasActivePlan: true,
          maxClients: trialMaxClients,
          currentClientCount,
          canAddClient: currentClientCount < trialMaxClients,
          planName: 'Affiliate Trial',
          planStatus: 'active'
        };
      }

      // No active subscription and no trial - allow only 1 client
      return {
        hasActivePlan: false,
        maxClients: 1,
        currentClientCount,
        canAddClient: currentClientCount < 1,
        planName: 'Free Plan',
        planStatus: 'no_subscription'
      };
    }

    // Has active subscription
    const maxClients = subscription.max_clients || 0;
    
    return {
      hasActivePlan: true,
      maxClients,
      currentClientCount,
      canAddClient: currentClientCount < maxClients,
      planName: subscription.plan_name || subscription.subscription_plan_name,
      planStatus: subscription.status
    };

  } catch (error) {
    console.error('Error checking user plan limits:', error);
    
    // In case of error, be conservative and allow only 1 client
    const clientCountResult = await getQuery(
      'SELECT COUNT(*) as count FROM clients WHERE user_id = ?',
      [effectiveUserId]
    ).catch(() => ({ count: 0 }));
    
    const currentClientCount = clientCountResult?.count || 0;
    
    return {
      hasActivePlan: false,
      maxClients: 1,
      currentClientCount,
      canAddClient: currentClientCount < 1,
      planName: 'Free Plan (Error)',
      planStatus: 'error'
    };
  }
}

/**
 * Validate if user can add a new client based on their plan limits
 * @param userId - The user ID to check
 * @returns Object with validation result and error message if applicable
 */
export async function validateClientQuota(userId: number): Promise<{
  canAdd: boolean;
  error?: string;
  planLimits?: PlanLimits;
}> {
  const planLimits = await checkUserPlanLimits(userId);
  
  if (planLimits.canAddClient) {
    return {
      canAdd: true,
      planLimits
    };
  }

  // Generate appropriate error message
  let errorMessage: string;
  
  if (!planLimits.hasActivePlan) {
    errorMessage = `Client quota exceeded. You have reached the maximum of ${planLimits.maxClients} client(s) allowed on the free plan. Please upgrade your plan to add more clients.`;
  } else {
    errorMessage = `Client quota exceeded. You have reached the maximum of ${planLimits.maxClients} client(s) allowed on your ${planLimits.planName} plan. Please upgrade your plan to add more clients.`;
  }

  return {
    canAdd: false,
    error: errorMessage,
    planLimits
  };
}
