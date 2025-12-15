import request from 'supertest';
import { app } from '../../src/index.js';

describe('GET /health', () => {
  test('returns status ok with timestamp', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    // Verify timestamp is a valid ISO date string
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });

  test('responds quickly (under 100ms)', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
