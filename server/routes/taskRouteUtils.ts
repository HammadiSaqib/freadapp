import multer from 'multer';
import path from 'path';
import fs from 'fs';

const taskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/tasks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const allowedTaskMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
]);

const allowedTaskExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip'
]);

const taskUpload = multer({
  storage: taskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeTypeAllowed = allowedTaskMimeTypes.has(file.mimetype);
    const extensionAllowed = allowedTaskExtensions.has(extension);
    if (mimeTypeAllowed || extensionAllowed) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type'));
  }
});

export const taskUploadFields = taskUpload.fields([
  { name: 'attachments', maxCount: 10 },
  { name: 'screenshot', maxCount: 1 }
]);

export const taskStatusValues = new Set(['pending', 'in_progress', 'completed', 'rejected']);
export const taskPriorityValues = new Set(['normal', 'medium', 'priority']);

function collectTaskUploadFiles(uploadedFiles: unknown): Express.Multer.File[] {
  if (!uploadedFiles) {
    return [];
  }
  if (Array.isArray(uploadedFiles)) {
    return uploadedFiles;
  }
  return Object.values(uploadedFiles as Record<string, Express.Multer.File[] | undefined>).flatMap((files) => files || []);
}

export function extractTaskUploadUrls(uploadedFiles: unknown): string[] {
  return collectTaskUploadFiles(uploadedFiles).map((file) => `/uploads/tasks/${file.filename}`);
}

export function normalizeRejectionReason(value: unknown): string | null | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }
  const safeValue = String(value).trim();
  return safeValue ? safeValue : null;
}

export function parseTaskAttachmentUrls(rawValue: unknown, screenshotUrl?: string | null): string[] {
  let parsedUrls: string[] = [];

  if (Array.isArray(rawValue)) {
    parsedUrls = rawValue.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } else if (typeof rawValue === 'string' && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        parsedUrls = parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      } else {
        parsedUrls = [rawValue.trim()];
      }
    } catch {
      parsedUrls = [rawValue.trim()];
    }
  }

  if (parsedUrls.length === 0 && screenshotUrl) {
    parsedUrls = [screenshotUrl];
  }

  return Array.from(new Set(parsedUrls));
}

export function normalizeTaskRecord<T extends { screenshot_url?: string | null; attachment_urls?: unknown; rejection_reason?: string | null }>(task: T | null | undefined) {
  if (!task) {
    return task;
  }

  const attachmentUrls = parseTaskAttachmentUrls(task.attachment_urls, task.screenshot_url);

  return {
    ...task,
    attachment_urls: attachmentUrls,
    screenshot_url: task.screenshot_url || attachmentUrls[0] || null,
    rejection_reason: task.rejection_reason || null,
  };
}

export function normalizeTaskRows<T extends { screenshot_url?: string | null; attachment_urls?: unknown; rejection_reason?: string | null }>(tasks: T[]) {
  return tasks.map((task) => normalizeTaskRecord(task));
}