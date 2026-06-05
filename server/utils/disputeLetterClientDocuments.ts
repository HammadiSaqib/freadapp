import path from 'path';
import fs from 'fs/promises';
import JSZip from 'jszip';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { allQuery, getQuery } from '../database/databaseAdapter.js';

export type ClientDocumentEntry = {
  label: string;
  url: string;
  kind: 'primary' | 'other';
};

type StoredOtherClientDocument = {
  file_url: string;
  original_name: string | null;
};

const CLIENT_DOCUMENTS_DIR = path.resolve(process.cwd(), 'uploads', 'client-documents');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

export const CLIENT_DOCUMENTS_PAGE_RULE_VERSION = 1;

const parseStoredOtherClientDocuments = (value: unknown): StoredOtherClientDocument[] => {
  if (!value) return [];

  let parsedValue = value;
  if (typeof value === 'string') {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsedValue)) return [];

  return parsedValue
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const candidate = entry as Record<string, unknown>;
      const fileUrl = typeof candidate.file_url === 'string' ? candidate.file_url.trim() : '';
      if (!fileUrl) return null;

      return {
        file_url: fileUrl,
        original_name:
          typeof candidate.original_name === 'string' && candidate.original_name.trim().length > 0
            ? candidate.original_name.trim()
            : null,
      };
    })
    .filter((entry): entry is StoredOtherClientDocument => Boolean(entry));
};

const resolveClientDocumentPath = (documentUrl: string): string | null => {
  if (!documentUrl) return null;

  try {
    const trimmed = documentUrl.trim();
    const pathname = trimmed.startsWith('http') ? new URL(trimmed).pathname : trimmed;
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

    if (!normalizedPath.startsWith('/uploads/client-documents/')) return null;

    const filename = path.basename(normalizedPath);
    const resolved = path.resolve(CLIENT_DOCUMENTS_DIR, filename);
    if (!resolved.startsWith(CLIENT_DOCUMENTS_DIR)) return null;
    return resolved;
  } catch {
    return null;
  }
};

const readClientDocument = async (documentUrl: string) => {
  const resolvedPath = resolveClientDocumentPath(documentUrl);
  if (!resolvedPath) return null;

  try {
    const buffer = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    return { buffer, ext };
  } catch {
    return null;
  }
};

const pushUniqueDocument = (
  documents: ClientDocumentEntry[],
  seenUrls: Set<string>,
  entry: ClientDocumentEntry | null,
) => {
  if (!entry) return;

  const url = String(entry.url || '').trim();
  if (!url || seenUrls.has(url)) return;

  seenUrls.add(url);
  documents.push({ ...entry, url });
};

export const loadClientDocumentsForClient = async (clientId: number): Promise<ClientDocumentEntry[]> => {
  if (!Number.isFinite(clientId) || clientId <= 0) return [];

  const documents: ClientDocumentEntry[] = [];
  const seenUrls = new Set<string>();

  try {
    const columnRows = (await allQuery(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'clients'
         AND COLUMN_NAME IN ('dl_or_id_card', 'ssc', 'poa', 'other_documents')`,
    )) as any[];

    const availableColumns = new Set(
      columnRows
        .map((row) => String(row?.COLUMN_NAME || row?.column_name || '').trim())
        .filter(Boolean),
    );

    if (availableColumns.size > 0) {
      const selectColumns = ['id', ...Array.from(availableColumns)].join(', ');
      const client = await getQuery(`SELECT ${selectColumns} FROM clients WHERE id = ?`, [clientId]);

      if (client) {
        pushUniqueDocument(documents, seenUrls, availableColumns.has('dl_or_id_card')
          ? { label: 'Government ID', url: String((client as any).dl_or_id_card || '').trim(), kind: 'primary' }
          : null);

        pushUniqueDocument(documents, seenUrls, availableColumns.has('ssc')
          ? { label: 'Social Security Number', url: String((client as any).ssc || '').trim(), kind: 'primary' }
          : null);

        pushUniqueDocument(documents, seenUrls, availableColumns.has('poa')
          ? { label: 'Proof of Address', url: String((client as any).poa || '').trim(), kind: 'primary' }
          : null);

        if (availableColumns.has('other_documents')) {
          parseStoredOtherClientDocuments((client as any).other_documents).forEach((entry, index) => {
            pushUniqueDocument(documents, seenUrls, {
              label: entry.original_name ? `Other Document: ${entry.original_name}` : `Other Document ${index + 1}`,
              url: entry.file_url,
              kind: 'other',
            });
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to load client documents for dispute PDF:', error);
  }

  try {
    const initialOtherDocumentCount = documents.filter((entry) => entry.kind === 'other').length;
    const additionalRows = (await allQuery(
      `SELECT file_url, original_name
       FROM client_additional_documents
       WHERE client_id = ?
         AND document_type = 'other'
       ORDER BY created_at ASC, id ASC`,
      [clientId],
    )) as any[];

    additionalRows.forEach((row, index) => {
      pushUniqueDocument(documents, seenUrls, {
        label:
          typeof row?.original_name === 'string' && row.original_name.trim().length > 0
            ? `Other Document: ${row.original_name.trim()}`
            : `Other Document ${initialOtherDocumentCount + index + 1}`,
        url: String(row?.file_url || '').trim(),
        kind: 'other',
      });
    });
  } catch (error: any) {
    if (!/doesn't exist|unknown table|no such table/i.test(String(error?.message || ''))) {
      console.error('Failed to load additional client documents for dispute PDF:', error);
    }
  }

  return documents;
};

const shouldLimitPdfDocumentToFirstPage = (entry: ClientDocumentEntry) => entry.kind === 'primary';

export const appendClientDocumentsToPdf = async (basePdf: Buffer, documents: ClientDocumentEntry[]): Promise<Buffer> => {
  if (!documents.length) return basePdf;

  const pdfDoc = await PDFLibDocument.load(basePdf);

  type PreviewBox = { x: number; y: number; width: number; height: number };
  type PreviewItem = {
    draw: (page: any, box: PreviewBox) => void;
  };

  const previewItems: PreviewItem[] = [];

  for (const entry of documents) {
    try {
      const docData = await readClientDocument(entry.url);
      if (!docData) continue;

      if (docData.ext === '.pdf') {
        const sourcePdf = await PDFLibDocument.load(docData.buffer, { ignoreEncryption: true });
        const pageIndices = sourcePdf.getPageIndices();
        const selectedPageIndices = shouldLimitPdfDocumentToFirstPage(entry)
          ? pageIndices.slice(0, 1)
          : pageIndices;

        if (!selectedPageIndices.length) continue;

        const embeddedPages = await pdfDoc.embedPdf(docData.buffer, selectedPageIndices);
        embeddedPages.forEach((embeddedPage) => {
          previewItems.push({
            draw: (page, box) => {
              const scale = Math.min(box.width / embeddedPage.width, box.height / embeddedPage.height);
              const drawWidth = embeddedPage.width * scale;
              const drawHeight = embeddedPage.height * scale;
              const x = box.x + (box.width - drawWidth) / 2;
              const y = box.y + (box.height - drawHeight) / 2;
              page.drawPage(embeddedPage, { x, y, width: drawWidth, height: drawHeight });
            },
          });
        });
        continue;
      }

      if (IMAGE_EXTENSIONS.has(docData.ext)) {
        const image = docData.ext === '.png'
          ? await pdfDoc.embedPng(docData.buffer)
          : await pdfDoc.embedJpg(docData.buffer);
        const baseSize = image.scale(1);

        previewItems.push({
          draw: (page, box) => {
            const scale = Math.min(box.width / baseSize.width, box.height / baseSize.height);
            const drawWidth = baseSize.width * scale;
            const drawHeight = baseSize.height * scale;
            const x = box.x + (box.width - drawWidth) / 2;
            const y = box.y + (box.height - drawHeight) / 2;
            page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
          },
        });
      }
    } catch {
      continue;
    }
  }

  if (!previewItems.length) return basePdf;

  const { width, height } = pdfDoc.getPage(0).getSize();
  const pageMargin = 20;

  for (const item of previewItems) {
    const page = pdfDoc.addPage([width, height]);
    item.draw(page, {
      x: pageMargin,
      y: pageMargin,
      width: width - pageMargin * 2,
      height: height - pageMargin * 2,
    });
  }

  return Buffer.from(await pdfDoc.save());
};

export const appendClientDocumentsToZip = async (zipBuffer: Buffer, documents: ClientDocumentEntry[]): Promise<Buffer> => {
  if (!documents.length) return zipBuffer;

  const zip = await JSZip.loadAsync(zipBuffer);
  let updatedPdfCount = 0;

  for (const entry of Object.values(zip.files)) {
    if (entry.dir || path.extname(entry.name).toLowerCase() !== '.pdf') continue;

    const originalPdf = await entry.async('nodebuffer');
    const updatedPdf = await appendClientDocumentsToPdf(originalPdf, documents);
    zip.file(entry.name, updatedPdf);
    updatedPdfCount += 1;
  }

  if (!updatedPdfCount) return zipBuffer;

  return Buffer.from(
    await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }),
  );
};