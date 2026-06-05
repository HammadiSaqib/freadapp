export type Testimonial = {
  id: number;
  video: string;
  client_name: string;
  client_role?: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function extractTestimonialsArray(payload: unknown): unknown[] {
  const queue: unknown[] = [payload];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null || seen.has(current)) {
      continue;
    }

    seen.add(current);

    if (Array.isArray(current)) {
      return current;
    }

    if (!isRecord(current)) {
      continue;
    }

    queue.push(
      current.data,
      current.testimonials,
      current.items,
      current.results,
      current.rows,
    );
  }

  return [];
}

function normalizeTestimonial(raw: unknown, index: number): Testimonial | null {
  if (!isRecord(raw)) {
    return null;
  }

  const rawVideo = typeof raw.video === 'string'
    ? raw.video.trim()
    : typeof raw.video_url === 'string'
      ? raw.video_url.trim()
      : '';

  if (!rawVideo) {
    return null;
  }

  const parsedId = typeof raw.id === 'number' ? raw.id : Number(raw.id);
  const clientName = typeof raw.client_name === 'string' ? raw.client_name : '';
  const clientRole = typeof raw.client_role === 'string' && raw.client_role.trim().length > 0
    ? raw.client_role
    : null;

  return {
    id: Number.isFinite(parsedId) ? parsedId : index + 1,
    video: rawVideo,
    client_name: clientName,
    client_role: clientRole,
  };
}

export function normalizeTestimonialsResponse(payload: unknown): Testimonial[] {
  return extractTestimonialsArray(payload)
    .map((item, index) => normalizeTestimonial(item, index))
    .filter((item): item is Testimonial => item !== null);
}