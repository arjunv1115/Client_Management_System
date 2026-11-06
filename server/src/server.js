import app from './app.js';
import { config } from './config.js';
import { initStore } from './db/store.js';

initStore();

const server = app.listen(config.port, () => {
  console.log('');
  console.log('  Client Management System API');
  console.log(`  → http://localhost:${config.port}/api/health`);
  console.log(`  → Environment: ${config.nodeEnv}`);
  console.log(`  → Client origin: ${config.clientUrl}`);
  console.log('');
});

function shutdown(signal) {
  console.log(`\n[server] ${signal} received, shutting down.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
