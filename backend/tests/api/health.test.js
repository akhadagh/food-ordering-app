/**
 * Health, readiness and the shape of the API surface.
 */
import { api } from '../helpers/api.js';

describe('health', () => {
  it('reports that the service and the database are up', async () => {
    const res = await api().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('ok');
    expect(typeof res.body.latencyMs).toBe('number');
  });

  it('reports readiness', async () => {
    const res = await api().get('/api/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('names the API at its root', async () => {
    const res = await api().get('/api');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Afia Food Hub API');
  });

  it('answers an unknown route with a structured 404', async () => {
    const res = await api().get('/api/there-is-nothing-here');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    expect(res.body.error.message).toMatch(/No route matches/);
  });
});

describe('request tracing', () => {
  it('gives every request an id and echoes the one it was sent', async () => {
    const generated = await api().get('/api/health');
    expect(generated.headers['x-request-id']).toBeTruthy();

    const echoed = await api().get('/api/health').set('X-Request-Id', 'trace-me-123');
    expect(echoed.headers['x-request-id']).toBe('trace-me-123');
  });
});
