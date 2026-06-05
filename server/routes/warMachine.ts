import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { runSmPiSuperEngine } from '../war-machine/smPiSuperEngine.js';
import { runInquiriesReviewEngine } from '../war-machine/smInquiriesReviewEngine.js';
import { runAccountsEvalEngine } from '../war-machine/smAccountsEvalEngine.js';
import { runPublicRecordsEvalEngine } from '../war-machine/smPublicRecordsEvalEngine.js';

const router = Router();

const bureauSchema = z.object({
  full_name: z.string().nullable(),
  aka_names: z.array(z.string()).default([]),
  dob: z.string().nullable(),
  ssn: z.string().nullable(),
  current_addresses: z.array(z.string()).default([]),
  previous_addresses: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  employment: z.array(z.string()).default([])
});

const inquiriesItemSchema = z.object({
  creditor_name: z.string().nullable(),
  date: z.string().nullable(),
  type: z.string().nullable(),
  industry: z.string().nullable(),
});

const inquiriesPayloadSchema = z.object({
  consumer_id: z.string(),
  inquiries: z.object({
    experian: z.array(inquiriesItemSchema).default([]),
    transunion: z.array(inquiriesItemSchema).default([]),
    equifax: z.array(inquiriesItemSchema).default([]),
  }),
  options: z
    .object({
      strict_mode: z.boolean().default(true),
      normalize: z.boolean().default(true),
      window_months: z.number().int().min(1).max(120).default(12),
    })
    .default({ strict_mode: true, normalize: true, window_months: 12 }),
});

const piPayloadSchema = z.object({
  consumer_id: z.string(),
  pi: z.object({
    experian: bureauSchema,
    transunion: bureauSchema,
    equifax: bureauSchema,
  }),
  options: z
    .object({
      strict_mode: z.boolean().default(true),
      normalize: z.boolean().default(true),
    })
    .default({ strict_mode: true, normalize: true }),
});

const accountsEvalPayloadSchema = z.object({
  version: z.string().default('1.0'),
  case_id: z.string(),
  consumer_id: z.string(),
  normalize: z.boolean().default(true),
  match_strategy: z.enum(['strict', 'lenient']).default('strict'),
  bureau_ids: z.array(z.number().int()).default([1, 2, 3]),
  data: z.object({
    Accounts: z.array(z.record(z.any())).default([]),
  }),
});

const publicRecordsEvalPayloadSchema = z.object({
  version: z.string().default('1.0'),
  case_id: z.string(),
  consumer_id: z.string(),
  normalize: z.boolean().default(true),
  bureau_ids: z.array(z.number().int()).default([1, 2, 3]),
  data: z.object({
    PublicRecords: z.array(z.record(z.any())).default([]),
  }),
});

const bodySchema = z.discriminatedUnion('command', [
  z.object({
    command: z.literal('WAR_MACHINE.RUN_SM_PI_SUPER_ENGINE'),
    payload: piPayloadSchema,
  }),
  z.object({
    command: z.literal('WAR_MACHINE.RUN_PI_SUPER_CODEX'),
    payload: piPayloadSchema,
  }),
  z.object({
    command: z.literal('WAR_MACHINE.RUN_INQUIRIES_REVIEW'),
    payload: inquiriesPayloadSchema,
  }),
  z.object({
    command: z.literal('WAR_MACHINE.ACCOUNTS_EVAL'),
    payload: accountsEvalPayloadSchema,
  }),
  z.object({
    command: z.literal('WAR_PUBLIC_RECORDS_EVAL'),
    payload: publicRecordsEvalPayloadSchema,
  }),
]);

router.post('/run', authenticateToken, (req: Request, res: Response) => {
  try {
    const parsed = bodySchema.parse(req.body);
    let result: any;
    if (parsed.command === 'WAR_MACHINE.RUN_INQUIRIES_REVIEW') {
      result = runInquiriesReviewEngine(parsed.payload as any);
    } else if (parsed.command === 'WAR_MACHINE.ACCOUNTS_EVAL') {
      result = runAccountsEvalEngine(parsed.payload as any);
    } else if (parsed.command === 'WAR_PUBLIC_RECORDS_EVAL') {
      result = runPublicRecordsEvalEngine(parsed.payload as any);
    } else {
      result = runSmPiSuperEngine(parsed.payload as any);
    }
    res.json({
      command: parsed.command,
      result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/accounts/eval', authenticateToken, (req: Request, res: Response) => {
  try {
    const payload = accountsEvalPayloadSchema.parse(req.body);
    const result = runAccountsEvalEngine(payload as any);
    res.json({ result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/public-records/eval', authenticateToken, (req: Request, res: Response) => {
  try {
    const payload = publicRecordsEvalPayloadSchema.parse(req.body);
    const result = runPublicRecordsEvalEngine(payload as any);
    res.json({ result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
