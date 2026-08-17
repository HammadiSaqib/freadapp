type ZoomMeeting = {
  id: number | string;
  uuid?: string;
  join_url: string;
  start_url: string;
};

const zoomConfig = () => ({
  accountId: process.env.ZOOM_ACCOUNT_ID || '',
  clientId: process.env.ZOOM_CLIENT_ID || '',
  clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
  hostUserId: process.env.ZOOM_HOST_USER_ID || 'me',
});

async function getAccessToken() {
  const config = zoomConfig();
  if (!config.accountId || !config.clientId || !config.clientSecret || !config.hostUserId) {
    throw new Error('Zoom Server-to-Server OAuth is not configured');
  }
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(config.accountId)}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!response.ok) throw new Error(`Zoom authentication failed (${response.status})`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('Zoom authentication returned no access token');
  return data.access_token;
}

async function zoomRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Zoom API request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function createZoomConsultation(input: { topic: string; startUtc: string; timezone: string }) {
  const { hostUserId } = zoomConfig();
  return zoomRequest(`/users/${encodeURIComponent(hostUserId)}/meetings`, {
    method: 'POST',
    body: JSON.stringify({
      topic: input.topic,
      type: 2,
      start_time: input.startUtc,
      duration: 30,
      timezone: input.timezone,
      settings: { join_before_host: false, waiting_room: true, mute_upon_entry: true, approval_type: 2 },
    }),
  }) as Promise<ZoomMeeting>;
}

export async function updateZoomConsultation(meetingId: string, startUtc: string, timezone: string) {
  await zoomRequest(`/meetings/${encodeURIComponent(meetingId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ start_time: startUtc, duration: 30, timezone }),
  });
}

export async function deleteZoomConsultation(meetingId: string) {
  await zoomRequest(`/meetings/${encodeURIComponent(meetingId)}`, { method: 'DELETE' });
}
