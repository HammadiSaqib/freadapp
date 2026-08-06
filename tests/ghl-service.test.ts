import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosGet, axiosPost, getQuery, runQuery } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
  getQuery: vi.fn(),
  runQuery: vi.fn()
}));

vi.mock('axios', () => ({
  default: {
    get: axiosGet,
    post: axiosPost,
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../server/database/databaseAdapter.js', () => ({
  getQuery,
  runQuery,
  allQuery: vi.fn()
}));

import {
  getGhlApiErrorDetails,
  syncAdminClientToGhl,
  validateGhlCredentials
} from '../server/services/ghlService.js';

describe('GoHighLevel integration service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the exact location using the private integration token', async () => {
    axiosGet.mockResolvedValue({
      status: 200,
      data: { location: { id: 'location-123', name: 'Admin Location' } }
    });

    await expect(validateGhlCredentials('pit-token', 'location-123')).resolves.toEqual({
      responseCode: 200,
      locationName: 'Admin Location'
    });
    expect(axiosGet).toHaveBeenCalledWith(
      'https://services.leadconnectorhq.com/locations/location-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer pit-token',
          Version: '2021-07-28'
        })
      })
    );
  });

  it('returns the useful HighLevel API message instead of a generic Axios 400', () => {
    expect(getGhlApiErrorDetails({
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: { message: ['locationId must be a valid sub-account ID'] }
      }
    })).toEqual({
      responseCode: 400,
      message: 'GoHighLevel returned 400: locationId must be a valid sub-account ID',
      retryable: false
    });
  });

  it('does not transmit when the admin has no active verified integration', async () => {
    getQuery.mockResolvedValueOnce(null);

    await expect(syncAdminClientToGhl(8, 44, 'client_updated')).resolves.toEqual({
      skipped: true,
      reason: 'not_connected'
    });
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('enforces client ownership before any outbound request', async () => {
    getQuery
      .mockResolvedValueOnce({
        id: 3,
        admin_id: 8,
        access_token: 'token-8',
        location_id: 'location-8',
        verified_at: '2026-07-29'
      })
      .mockResolvedValueOnce(null);

    await expect(syncAdminClientToGhl(8, 99, 'client_updated')).resolves.toEqual({
      skipped: true,
      reason: 'tenant_mismatch'
    });
    expect(axiosPost).not.toHaveBeenCalled();
    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining('integration_activity_logs'),
      expect.arrayContaining([3, 8, 'client_updated', 'failed'])
    );
  });

  it('upserts the approved client fields into only the admin location and logs the response', async () => {
    getQuery
      .mockResolvedValueOnce({
        id: 3,
        admin_id: 8,
        access_token: 'token-8',
        location_id: 'location-8',
        verified_at: '2026-07-29',
        field_mappings: JSON.stringify({ creditScore: 'field-credit-score' })
      })
      .mockResolvedValueOnce({
        id: 44,
        user_id: 8,
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        phone: '+15555550123',
        address: '10 Main St',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        country: 'US',
        credit_score: 710,
        status: 'active'
      })
      .mockResolvedValueOnce({ status: 'completed' })
      .mockResolvedValueOnce(null);
    axiosPost
      .mockResolvedValueOnce({
        status: 200,
        data: { contact: { id: 'ghl-contact-1' } }
      })
      .mockResolvedValueOnce({ status: 201, data: {} });

    await expect(syncAdminClientToGhl(8, 44, 'client_updated')).resolves.toEqual({
      skipped: false,
      contactId: 'ghl-contact-1',
      responseCode: 200
    });
    expect(axiosPost).toHaveBeenNthCalledWith(
      1,
      'https://services.leadconnectorhq.com/contacts/upsert',
      expect.objectContaining({
        locationId: 'location-8',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+15555550123',
        address1: '10 Main St',
        customFields: [{ id: 'field-credit-score', fieldValue: 710 }]
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-8' })
      })
    );
    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining('integration_activity_logs'),
      expect.arrayContaining([3, 8, 'client_updated', 'success', expect.any(String), 44, 200])
    );
  });
});
