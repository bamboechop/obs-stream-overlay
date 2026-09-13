import http from 'node:http';
import net from 'node:net';
import { emptyState, reduceSnapshot } from './state.mjs';

export function createDataSenderBridge({ host = '127.0.0.1', port = 28765, reconnectMs = 3000, startService = true, logger = console } = {}) {
  let state = emptyState();
  let socket;
  let retry;
  let stopped = true;
  const clients = new Set();
  const encode = () => `data: ${JSON.stringify(state)}\n\n`;
  function publish(next) {
    if (next === state) {
      return;
    }
    state = next;
    for (const client of clients) {
      if (!client.write(encode())) {
        client.destroy();
        clients.delete(client);
      }
    }
  }
  function connect() {
    if (stopped) {
      return;
    }
    socket = net.createConnection({ host, port });
    socket.setEncoding('utf8');
    let pending = '';
    socket.on('connect', () => {
      publish(emptyState(true));
      const commands = [
        ...(startService ? [{ type: 'service.start' }] : []),
        { type: 'subscribe', sources: ['race_data', 'player_cp_info', 'vehicle_state'] },
        { type: 'client.set_service_status_telemetry', enabled: false },
      ];
      for (const command of commands) {
        socket.write(`${JSON.stringify(command)}\n`);
      }
    });
    socket.on('data', (chunk) => {
      pending += chunk;
      while (pending.includes('\n')) {
        const newline = pending.indexOf('\n');
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        if (!line.trim()) {
          continue;
        }
        try {
          const message = JSON.parse(line);
          if (message?.type === 'error') {
            logger.warn('[DataSender] Server error:', message);
          }
          publish(reduceSnapshot(state, message));
        } catch {
          logger.warn('[DataSender] Ignored invalid JSON');
        }
      }
      if (pending.length > 4 * 1024 * 1024) {
        logger.warn('[DataSender] Incomplete message exceeded buffer limit');
        socket.destroy();
      }
    });
    socket.on('error', error => logger.warn(`[DataSender] ${error.message}`));
    socket.on('close', () => {
      publish(emptyState());
      if (!stopped) {
        retry = setTimeout(connect, reconnectMs);
      }
    });
  }
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/events') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    response.write(encode());
    clients.add(response);
    const heartbeat = setInterval(() => {
      if (!response.write(': heartbeat\n\n')) {
        response.destroy();
      }
    }, 15000);
    response.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(response);
    });
  });
  return {
    server,
    start(httpPort = 28766) {
      if (!stopped) {
        return;
      }
      stopped = false;
      server.listen(httpPort, '127.0.0.1', connect);
    },
    stop() {
      stopped = true;
      clearTimeout(retry);
      socket?.destroy();
      for (const client of clients) {
        client.end();
      }
      server.close();
    },
  };
}
