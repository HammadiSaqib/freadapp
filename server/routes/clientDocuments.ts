import express from 'express';
import { NextFunction, Request, Response } from 'express';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';

const router = express.Router();

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_RESIZE_STEPS = [3200, 2800, 2400, 2000, 1600, 1280, 1024, 800, 640];
const IMAGE_QUALITY_STEPS = [82, 72, 62, 52, 42, 32, 24];
const compressibleImageExtensions = new Set(['.jpeg', '.jpg', '.png', '.gif', '.webp']);

const primaryUploadExtensions = new Set(['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.webp']);
const primaryUploadMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/gif',
  'image/webp',
]);

const additionalUploadExtensions = new Set([
  ...primaryUploadExtensions,
  '.doc',
  '.docx',
]);

const additionalUploadMimeTypes = new Set([
  ...primaryUploadMimeTypes,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function getServerBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3001';
  return `${proto}://${host}`;
}

// Configure multer for client document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/client-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

function createUploadMiddleware(
  allowedExtensions: Set<string>,
  allowedMimeTypes: Set<string>,
  invalidTypeMessage: string,
) {
  return multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const mimetype = String(file.mimetype || '').toLowerCase();
      const hasAllowedExtension = allowedExtensions.has(extension);
      const hasAllowedMimeType = !mimetype || mimetype === 'application/octet-stream' || allowedMimeTypes.has(mimetype);

      if (hasAllowedExtension && hasAllowedMimeType) {
        return cb(null, true);
      }

      cb(new Error(invalidTypeMessage));
    }
  });
}

type MutableUploadedFile = Express.Multer.File & {
  filename: string;
  path: string;
  destination: string;
  mimetype: string;
  size: number;
};

async function safelyUnlink(filePath?: string | null) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore cleanup failures.
  }
}

async function optimizePdfUpload(file: MutableUploadedFile) {
  if (path.extname(file.filename).toLowerCase() !== '.pdf') return;

  try {
    const originalBuffer = await fs.promises.readFile(file.path);
    const pdfDoc = await PDFLibDocument.load(originalBuffer, { ignoreEncryption: true });
    const optimizedBuffer = Buffer.from(await pdfDoc.save({ useObjectStreams: true }));

    if (optimizedBuffer.length < originalBuffer.length) {
      await fs.promises.writeFile(file.path, optimizedBuffer);
      file.size = optimizedBuffer.length;
    }
  } catch (error) {
    console.warn('Skipping PDF optimization for uploaded client document:', error);
  }
}

async function compressUploadedImage(file: MutableUploadedFile) {
  const extension = path.extname(file.filename).toLowerCase();
  if (!compressibleImageExtensions.has(extension)) return;

  try {
    const inputBuffer = await fs.promises.readFile(file.path);
    let bestBuffer: Buffer | null = null;

    for (const maxDimension of IMAGE_RESIZE_STEPS) {
      for (const quality of IMAGE_QUALITY_STEPS) {
        const candidate = await sharp(inputBuffer, { animated: false })
          .rotate()
          .flatten({ background: '#ffffff' })
          .resize({
            width: maxDimension,
            height: maxDimension,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();

        if (!bestBuffer || candidate.length < bestBuffer.length) {
          bestBuffer = candidate;
        }

        if (candidate.length <= TARGET_IMAGE_BYTES) {
          break;
        }
      }

      if (bestBuffer && bestBuffer.length <= TARGET_IMAGE_BYTES) {
        break;
      }
    }

    if (!bestBuffer) return;

    const outputFilename = `${path.parse(file.filename).name}.jpg`;
    const outputPath = path.join(path.dirname(file.path), outputFilename);

    await fs.promises.writeFile(outputPath, bestBuffer);
    if (outputPath !== file.path) {
      await safelyUnlink(file.path);
    }

    file.filename = outputFilename;
    file.path = outputPath;
    file.mimetype = 'image/jpeg';
    file.size = bestBuffer.length;
  } catch (error) {
    console.warn('Skipping image compression for uploaded client document:', error);
  }
}

async function optimizeUploadedFile(file: MutableUploadedFile) {
  await compressUploadedImage(file);
  await optimizePdfUpload(file);
}

const primaryUpload = createUploadMiddleware(
  primaryUploadExtensions,
  primaryUploadMimeTypes,
  'Invalid file type. Only PDF, JPG, JPEG, PNG, GIF, and WEBP files are allowed.',
);

const additionalUpload = createUploadMiddleware(
  additionalUploadExtensions,
  additionalUploadMimeTypes,
  'Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG, GIF, and WEBP files are allowed.',
);

function handleUploadMiddlewareError(error: unknown, _req: Request, res: Response, next: NextFunction) {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'File is too large. Maximum upload size is 100MB.' });
      return;
    }

    res.status(400).json({ message: error.message || 'File upload failed.' });
    return;
  }

  const message = error instanceof Error ? error.message : 'File upload failed.';
  res.status(400).json({ message });
}

const singleDocumentUpload = (req: Request, res: Response, next: NextFunction) => {
  primaryUpload.single('file')(req, res, (error) => handleUploadMiddlewareError(error, req, res, next));
};

const singleAdditionalDocumentUpload = (req: Request, res: Response, next: NextFunction) => {
  additionalUpload.single('file')(req, res, (error) => handleUploadMiddlewareError(error, req, res, next));
};

const multipleDocumentUpload = (req: Request, res: Response, next: NextFunction) => {
  additionalUpload.fields([
    { name: 'files', maxCount: 20 },
    { name: 'files[]', maxCount: 20 },
    { name: 'file', maxCount: 20 },
  ])(req, res, (error) => handleUploadMiddlewareError(error, req, res, next));
};

function collectUploadedFiles(uploadedFiles: Request['files']): Express.Multer.File[] {
  if (!uploadedFiles) return [];
  if (Array.isArray(uploadedFiles)) return uploadedFiles;

  const groupedFiles = uploadedFiles as Record<string, Express.Multer.File[] | undefined>;
  return [
    ...(groupedFiles.files || []),
    ...(groupedFiles['files[]'] || []),
    ...(groupedFiles.file || []),
  ];
}

type StoredOtherDocument = {
  id: number;
  document_type: 'other';
  file_url: string;
  original_name: string | null;
  created_at: string;
};

const primaryClientDocumentColumns = ['dl_or_id_card', 'poa', 'ssc'] as const;
const clientDocumentColumns = [...primaryClientDocumentColumns, 'other_documents'] as const;
type PrimaryClientDocumentColumn = typeof primaryClientDocumentColumns[number];

let clientDocumentColumnsPromise: Promise<Set<string>> | null = null;

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ER_NO_SUCH_TABLE|doesn't exist|does not exist/i.test(message);
}

async function getExistingClientDocumentColumns(): Promise<Set<string>> {
  if (!clientDocumentColumnsPromise) {
    clientDocumentColumnsPromise = (async () => {
      try {
        const rows = await allQuery(
          `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'clients'
              AND COLUMN_NAME IN (${clientDocumentColumns.map(() => '?').join(', ')})`,
          [...clientDocumentColumns]
        );
        return new Set(rows.map((row: any) => String(row.COLUMN_NAME)));
      } catch (error) {
        clientDocumentColumnsPromise = null;
        console.warn('Failed to detect client document columns. Falling back to available-safe defaults:', error);
        return new Set<string>();
      }
    })();
  }

  return clientDocumentColumnsPromise;
}

async function getClientPrimaryDocumentColumn(type: string): Promise<PrimaryClientDocumentColumn | null> {
  if (!primaryClientDocumentColumns.includes(type as PrimaryClientDocumentColumn)) {
    return null;
  }

  const existingColumns = await getExistingClientDocumentColumns();
  return existingColumns.has(type) ? (type as PrimaryClientDocumentColumn) : null;
}

async function getClientDocumentSnapshot(clientId: string) {
  const existingColumns = await getExistingClientDocumentColumns();
  const selectParts = [
    'id',
    existingColumns.has('dl_or_id_card') ? 'dl_or_id_card' : 'NULL AS dl_or_id_card',
    existingColumns.has('poa') ? 'poa' : 'NULL AS poa',
    existingColumns.has('ssc') ? 'ssc' : 'NULL AS ssc',
    existingColumns.has('other_documents') ? 'other_documents' : 'NULL AS other_documents',
  ];

  return getQuery(`SELECT ${selectParts.join(', ')} FROM clients WHERE id = ?`, [clientId]);
}

function normalizeStoredDate(value: unknown): string {
  const parsed = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function normalizeStoredOtherDocument(value: unknown): StoredOtherDocument | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const id = Number(candidate.id);
  const fileUrl = typeof candidate.file_url === 'string' ? candidate.file_url : '';
  if (!Number.isFinite(id) || !fileUrl) return null;

  return {
    id,
    document_type: 'other',
    file_url: fileUrl,
    original_name: typeof candidate.original_name === 'string' ? candidate.original_name : null,
    created_at: normalizeStoredDate(candidate.created_at),
  };
}

function parseStoredOtherDocuments(value: unknown): StoredOtherDocument[] {
  if (!value) return [];
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => normalizeStoredOtherDocument(entry))
    .filter((entry): entry is StoredOtherDocument => Boolean(entry));
}

function sortStoredOtherDocuments(documents: StoredOtherDocument[]): StoredOtherDocument[] {
  return [...documents].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function mergeStoredOtherDocuments(
  currentDocuments: StoredOtherDocument[],
  incomingDocuments: StoredOtherDocument[]
): StoredOtherDocument[] {
  const merged = new Map<string, StoredOtherDocument>();
  for (const doc of [...currentDocuments, ...incomingDocuments]) {
    const key = `${doc.file_url}::${doc.original_name || ''}::${doc.created_at}`;
    if (!merged.has(key)) merged.set(key, doc);
  }
  return sortStoredOtherDocuments([...merged.values()]);
}

function createStoredOtherDocument(fileUrl: string, originalName: string): StoredOtherDocument {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000000),
    document_type: 'other',
    file_url: fileUrl,
    original_name: originalName || null,
    created_at: new Date().toISOString(),
  };
}

async function saveClientOtherDocuments(clientId: string, documents: StoredOtherDocument[]) {
  const normalizedDocuments = sortStoredOtherDocuments(documents);
  await runQuery(
    'UPDATE clients SET other_documents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(normalizedDocuments), clientId]
  );
}

async function ensureAdditionalDocsTable() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS client_additional_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        original_name VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_client_doc (client_id, document_type),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    // Table likely already exists
  }
}
ensureAdditionalDocsTable();

async function getLegacyOtherDocuments(clientId: string): Promise<StoredOtherDocument[]> {
  try {
    await ensureAdditionalDocsTable();
    const legacyDocuments = await allQuery(
      `SELECT id, file_url, original_name, created_at
         FROM client_additional_documents
        WHERE client_id = ? AND document_type = 'other'
        ORDER BY created_at DESC`,
      [clientId]
    );
    return legacyDocuments
      .map((doc: any) => normalizeStoredOtherDocument({
        id: doc.id, file_url: doc.file_url,
        original_name: doc.original_name, created_at: doc.created_at,
      }))
      .filter((doc: any): doc is StoredOtherDocument => Boolean(doc));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function loadClientOtherDocuments(clientId: string): Promise<StoredOtherDocument[]> {
  const client = await getQuery(
    'SELECT id, other_documents FROM clients WHERE id = ?',
    [clientId]
  );
  if (!client) return [];

  const currentDocuments = parseStoredOtherDocuments(client.other_documents);
  const legacyDocuments = await getLegacyOtherDocuments(clientId);
  if (!legacyDocuments.length) return sortStoredOtherDocuments(currentDocuments);

  const mergedDocuments = mergeStoredOtherDocuments(currentDocuments, legacyDocuments);
  await saveClientOtherDocuments(clientId, mergedDocuments);
  await runQuery(
    `DELETE FROM client_additional_documents WHERE client_id = ? AND document_type = 'other'`,
    [clientId]
  );
  return mergedDocuments;
}

// Upload document (clients table columns: dl_or_id_card, poa, ssc)
router.post('/:clientId/upload', authenticateToken, singleDocumentUpload, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!['dl_or_id_card', 'poa', 'ssc'].includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid document type' });
    }

    await optimizeUploadedFile(req.file as MutableUploadedFile);

    const client = await getQuery('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Client not found' });
    }

    const baseUrl = getServerBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/client-documents/${req.file.filename}`;

    const targetColumn = await getClientPrimaryDocumentColumn(type);
    if (!targetColumn) {
      await safelyUnlink(req.file.path);
      return res.status(500).json({
        message: `The clients.${type} column is missing in the live database. Run the DB migration before uploading this document type.`,
      });
    }

    await runQuery(`UPDATE clients SET ${targetColumn} = ? WHERE id = ?`, [fileUrl, clientId]);
    res.json({ message: 'Document uploaded successfully', fileUrl, type });
  } catch (error) {
    console.error('Error uploading document:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    res.status(500).json({ message: 'Error uploading document' });
  }
});

// Delete document
router.delete('/:clientId/document/:type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, type } = req.params;
    if (!['dl_or_id_card', 'poa', 'ssc'].includes(type)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const targetColumn = await getClientPrimaryDocumentColumn(type);
    if (!targetColumn) {
      return res.status(500).json({
        message: `The clients.${type} column is missing in the live database. Run the DB migration before deleting this document type.`,
      });
    }

    await runQuery(`UPDATE clients SET ${targetColumn} = NULL WHERE id = ?`, [clientId]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
});

// Upload additional document
router.post('/:clientId/additional/upload', authenticateToken, singleAdditionalDocumentUpload, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { type } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!['dl_or_id_card', 'poa', 'ssc', 'other'].includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid document type' });
    }

    await optimizeUploadedFile(req.file as MutableUploadedFile);

    const client = await getQuery('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Client not found' });
    }

    const baseUrl = getServerBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/client-documents/${req.file.filename}`;

    if (type === 'other') {
      const existing = await loadClientOtherDocuments(clientId);
      const uploaded = createStoredOtherDocument(fileUrl, req.file.originalname);
      await saveClientOtherDocuments(clientId, [...existing, uploaded]);
      return res.json({ message: 'Additional document uploaded successfully', fileUrl, type, data: uploaded });
    }

    await ensureAdditionalDocsTable();
    await runQuery(
      'INSERT INTO client_additional_documents (client_id, document_type, file_url, original_name) VALUES (?, ?, ?, ?)',
      [clientId, type, fileUrl, req.file.originalname]
    );
    res.json({ message: 'Additional document uploaded successfully', fileUrl, type });
  } catch (error) {
    console.error('Error uploading additional document:', error);
    if ((req as any).file?.path && fs.existsSync((req as any).file.path)) {
      try { fs.unlinkSync((req as any).file.path); } catch (e) { /* ignore */ }
    }
    res.status(500).json({ message: 'Error uploading additional document' });
  }
});

// Get all documents for client
router.get('/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await getClientDocumentSnapshot(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const otherDocs = await loadClientOtherDocuments(clientId);

    let additionalDocs: any[] = [];
    try {
      additionalDocs = await allQuery(
        'SELECT * FROM client_additional_documents WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );
    } catch (e) {
      if (!isMissingTableError(e)) throw e;
    }

    res.json({
      success: true,
      data: {
        dl_or_id_card: client.dl_or_id_card || null,
        poa: client.poa || null,
        ssc: client.ssc || null,
        other_documents: otherDocs,
        additional_documents: additionalDocs,
      }
    });
  } catch (error) {
    console.error('Error fetching client documents:', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// Upload multiple additional documents at once
router.post('/:clientId/additional/upload-multiple', authenticateToken, multipleDocumentUpload, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { type } = req.body;
    const files = collectUploadedFiles(req.files);
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded. Expected multipart field named file, files, or files[].' });
    }
    if (!['dl_or_id_card', 'poa', 'ssc', 'other'].includes(type)) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const client = await getQuery('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      return res.status(404).json({ message: 'Client not found' });
    }

    const baseUrl = getServerBaseUrl(req);

    if (type === 'other') {
      for (const file of files) {
        await optimizeUploadedFile(file as MutableUploadedFile);
      }

      const existingOtherDocuments = await loadClientOtherDocuments(clientId);
      const uploadedDocuments = files.map((file) =>
        createStoredOtherDocument(
          `${baseUrl}/uploads/client-documents/${file.filename}`,
          file.originalname
        )
      );

      await saveClientOtherDocuments(clientId, [
        ...existingOtherDocuments,
        ...uploadedDocuments,
      ]);

      return res.json({
        success: true,
        message: `${uploadedDocuments.length} document(s) uploaded successfully`,
        data: uploadedDocuments,
      });
    }

    await ensureAdditionalDocsTable();
    const uploaded: any[] = [];
    for (const file of files) {
      await optimizeUploadedFile(file as MutableUploadedFile);
      const fileUrl = `${baseUrl}/uploads/client-documents/${file.filename}`;
      await runQuery(
        'INSERT INTO client_additional_documents (client_id, document_type, file_url, original_name) VALUES (?, ?, ?, ?)',
        [clientId, type, fileUrl, file.originalname]
      );
      uploaded.push({ fileUrl, originalName: file.originalname });
    }

    res.json({ success: true, message: `${uploaded.length} document(s) uploaded successfully`, data: uploaded });
  } catch (error) {
    console.error('Error uploading multiple documents:', error);
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) {
      files.forEach(f => { try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (e) {} });
    }
    res.status(500).json({ message: 'Error uploading documents' });
  }
});

// Delete additional document
router.delete('/:clientId/additional/:docId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, docId } = req.params;

    // Check if it's an "other" document stored in clients.other_documents JSON
    const existing = await loadClientOtherDocuments(clientId);
    const otherDocIndex = existing.findIndex(d => String(d.id) === String(docId));
    if (otherDocIndex !== -1) {
      existing.splice(otherDocIndex, 1);
      await saveClientOtherDocuments(clientId, existing);
      return res.json({ success: true, message: 'Document deleted successfully' });
    }

    // Otherwise try the additional documents table
    await runQuery(
      'DELETE FROM client_additional_documents WHERE id = ? AND client_id = ?',
      [docId, clientId]
    );
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting additional document:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
});

export default router;
