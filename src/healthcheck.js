// Standalone health check script for Docker HEALTHCHECK
// Exit 0 = healthy, Exit 1 = unhealthy

import http from 'http';

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Healthy
  } else {
    process.exit(1); // Unhealthy
  }
});

req.on('error', () => {
  process.exit(1); // Unhealthy
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1); // Unhealthy
});

req.end();
