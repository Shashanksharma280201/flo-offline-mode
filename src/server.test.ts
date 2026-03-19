import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';

describe('Express Server', () => {
  let server: http.Server;

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it('should start and listen on PORT from env (default 3000)', async () => {
    // This test will fail until server.ts is created
    const { default: app } = await import('./server.js');

    expect(app).toBeDefined();
    expect(process.env.PORT || 3000).toBe(3000);
  });

  it('should have GET /health route', async () => {
    // This test will fail until server.ts implements /health route
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
  });

  it('should have GET / route returning API info', async () => {
    // This test will fail until server.ts implements / route
    const response = await fetch('http://localhost:3000/');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('timestamp');
  });

  it('should handle SIGTERM signal for graceful shutdown', async () => {
    // This test will fail until server.ts implements SIGTERM handler
    const processOnSpy = vi.spyOn(process, 'on');

    await import('./server.js');

    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    processOnSpy.mockRestore();
  });
});
