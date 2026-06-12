import { Request, Response, NextFunction } from 'express';
import {
  getScoreMachineEliteAccessStatus,
  hasSignedScoreMachineEliteAgreement,
} from '../utils/scoreMachineEliteAccess.js';

export async function requireSignedScoreMachineEliteAgreement(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user) {
      return next();
    }

    if (user.role === 'super_admin') {
      return next();
    }

    if (!['admin', 'employee', 'user', 'funding_manager'].includes(String(user.role || ''))) {
      return next();
    }

    const eligibility = await getScoreMachineEliteAccessStatus(Number(user.id));
    if (!eligibility.hasAccess) {
      return res.status(403).json({
        error: 'score_machine_elite_required',
        message: 'The Capsol Elite access is required for this feature.',
      });
    }

    const hasSignedAgreement = await hasSignedScoreMachineEliteAgreement(Number(user.id));
    if (hasSignedAgreement) {
      return next();
    }

    return res.status(403).json({
      error: 'score_machine_elite_agreement_required',
      message: 'Access blocked until The Capsol Elite agreement is signed.',
      requires_signature: true,
    });
  } catch (error: any) {
    console.error('The Capsol Elite guard error:', error);
    return res.status(500).json({ error: 'score_machine_elite_guard_failed', details: error.message });
  }
}