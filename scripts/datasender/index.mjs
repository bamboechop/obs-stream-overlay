import { createDataSenderBridge } from './bridge.mjs';

function readPort(value, fallback) {
  const port = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DataSender ports must be integers between 1 and 65535');
  }
  return port;
}

const httpPort = readPort(process.env.DATASENDER_BRIDGE_PORT, 28766);
const bridge = createDataSenderBridge({
  host: process.env.DATASENDER_HOST || '127.0.0.1',
  port: readPort(process.env.DATASENDER_PORT, 28765),
  startService: process.env.DATASENDER_START_SERVICE !== 'false',
});
bridge.server.on('error', (error) => {
  console.error('[DataSender] Bridge failed:', error.message);
  bridge.stop();
  process.exitCode = 1;
});
bridge.start(httpPort);
bridge.server.on('listening', () => console.info(`[DataSender] http://127.0.0.1:${httpPort}/events`));
process.once('SIGINT', () => bridge.stop());
process.once('SIGTERM', () => bridge.stop());
