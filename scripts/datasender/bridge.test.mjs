/* eslint-disable test/no-import-node-test -- Uses the built-in Node runner, without Vitest. */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import { it } from 'node:test';
import { createDataSenderBridge } from './bridge.mjs';
import { emptyState, reduceSnapshot } from './state.mjs';

const snapshot = (source, data) => ({ type: 'snapshot', source, data: { available: true, ...data } });
const race = snapshot('race_data', { cpCount: 4, cpsToFinish: 50, lapsNb: 10 });
function player(cpCount, isFinished = false) {
  return snapshot('player_cp_info', { players: [
    { isLocalPlayer: false, cpCount: 99 },
    { isLocalPlayer: true, cpCount, playerIsRacing: !isFinished, isFinished },
  ] });
}

it('projects local progress, finish, fallback, unavailable sources and ignores unrelated messages', () => {
  let state = reduceSnapshot(emptyState(true), race);
  state = reduceSnapshot(state, player(5));
  assert.deepEqual(state.progress, { gatesPerLap: 5, currentLap: 2, currentCp: 0 });
  assert.equal(reduceSnapshot(state, { type: 'ack' }), state);
  assert.equal(reduceSnapshot(state, snapshot('camera', {})), state);
  assert.equal(reduceSnapshot(state, player(5)), state);
  assert.deepEqual(reduceSnapshot(state, player(50, true)).progress, { gatesPerLap: 5, currentLap: 10, currentCp: 4 });
  const fallback = reduceSnapshot(state, snapshot('race_data', { cpCount: 4, cpsToFinish: 0, lapsNb: 10 }));
  assert.equal(fallback.progress.gatesPerLap, 5);
  const single = reduceSnapshot(state, snapshot('race_data', { cpCount: 4, cpsToFinish: 5, lapsNb: 1 }));
  assert.equal(single.progress.currentLap, 1);
  assert.equal(reduceSnapshot(state, snapshot('player_cp_info', { players: [] })).progress, null);
  assert.equal(reduceSnapshot(state, snapshot('race_data', { available: false })).raceData, null);
  assert.equal(reduceSnapshot(state, snapshot('race_data', { cpCount: -1 })).progress, null);
});

it('vehicle physics changes do not publish; car changes and availability do', () => {
  const vehicle = (vehicleType, speed) => snapshot('vehicle_state', { vehicleState: { engine: { vehicleType }, speed } });
  const state = reduceSnapshot(emptyState(true), vehicle('CarSport', 1));
  assert.equal(reduceSnapshot(state, vehicle('CarSport', 200)), state);
  assert.equal(reduceSnapshot(state, vehicle('CarSnow', 200)).vehicleType, 'CarSnow');
  assert.equal(reduceSnapshot(state, snapshot('vehicle_state', { available: false })).vehicleType, null);
});

it('handles TCP framing, exact subscription, SSE replay and reconnect clearing', { timeout: 5000 }, async (t) => {
  const tcp = net.createServer();
  tcp.listen(0, '127.0.0.1');
  await once(tcp, 'listening');
  const sockets = new Set();
  tcp.on('connection', socket => sockets.add(socket));
  const bridge = createDataSenderBridge({ port: tcp.address().port, reconnectMs: 20, logger: { warn() {} } });
  t.after(() => {
    bridge.stop();
    for (const socket of sockets) {
      socket.destroy();
    }
    tcp.close();
  });
  const connection = once(tcp, 'connection');
  bridge.start(0);
  const [socket] = await connection;
  socket.setEncoding('utf8');
  let commands = '';
  for await (const chunk of socket.iterator({ destroyOnReturn: false })) {
    commands += chunk;
    if (commands.trim().split('\n').length >= 3) {
      break;
    }
  }
  assert.deepEqual(JSON.parse(commands.trim().split('\n')[1]), { type: 'subscribe', sources: ['race_data', 'player_cp_info', 'vehicle_state'] });
  const states = [];
  let pending = '';
  const request = http.get(`http://127.0.0.1:${bridge.server.address().port}/events`);
  t.after(() => request.destroy());
  const [response] = await once(request, 'response');
  response.setEncoding('utf8');
  response.on('data', (chunk) => {
    pending += chunk;
    const frames = pending.split('\n\n');
    pending = frames.pop();
    for (const frame of frames) {
      if (frame.startsWith('data: ')) {
        states.push(JSON.parse(frame.slice(6)));
      }
    }
  });
  const waitFor = async (predicate) => {
    while (!predicate()) {
      await once(response, 'data');
    }
  };
  await waitFor(() => states.length > 0);
  assert.equal(states[0].connected, true);
  const payload = `${JSON.stringify(race)}\n${JSON.stringify(player(6))}\n`;
  socket.write(payload.slice(0, 17));
  socket.write(payload.slice(17));
  await waitFor(() => states.some(state => state.progress?.currentCp === 1));
  const reconnect = once(tcp, 'connection');
  socket.destroy();
  await waitFor(() => states.some(state => !state.connected));
  assert.deepEqual(states.find(state => !state.connected), emptyState());
  await reconnect;
  await waitFor(() => states.at(-1).connected);
  assert.equal(states.at(-1).raceData, null);
});
