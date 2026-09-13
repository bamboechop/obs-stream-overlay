# obs-stream-overlay

## Trackmania DataSender bridge

Run `npm run datasender` alongside the overlay. This standalone Node service connects
to the DataSender v2 TCP server at `127.0.0.1:28765`, starts its service, and subscribes
to exactly `race_data`, `player_cp_info`, and `vehicle_state`. Trackmania, Openplanet,
DataSender and the source dependencies (MLFeed Race Data and VehicleState) must be running.
No additional npm dependencies are required.

The read-only SSE endpoint is `http://127.0.0.1:28766/events`. It replays the latest
state to new clients and sends updates only when selected values change. Non-snapshot
messages are discarded; server errors are logged only in the bridge console.
TCP disconnection clears all values and retries every three seconds. Missing,
unavailable or invalid source data is represented by `null`, including a missing local player.

`state` exposes `raceData` (`cpCount`, `cpsToFinish`, `lapsNb`), `playerCpInfo`
(local player's `cpCount`, `isLocalPlayer`, `playerIsRacing`, `isFinished`),
`vehicleType`, and derived `progress`. Lap is one-based; current CP is the number
of ordinary CPs passed in that lap (zero at its start). Gates per lap use a positive
integer `cpsToFinish / lapsNb`, falling back to `cpCount + 1` as in the prototype.
Finished runs clamp to the final lap and ordinary CP count. Progress is derived from
the latest independently received race/player snapshots, not an atomic game frame.
Consumers can use racing/finished flags to choose what to display.

Components share one EventSource connection; it closes on the last unmount.
`bridgeConnected` describes the browser-to-bridge link, while `state.connected`
describes the bridge-to-DataSender TCP link, not source availability.

Optional process environment variables: `DATASENDER_HOST`, `DATASENDER_PORT`,
`DATASENDER_BRIDGE_PORT`, and `DATASENDER_START_SERVICE=false` to skip service.start.
The Node command reads process environment variables, not Vite `.env` files.
Set `VITE_DATASENDER_URL` in the frontend environment to override the SSE URL.
The bridge binds only to IPv4 loopback and allows cross-origin reads. For an HTTPS
overlay where browser policy blocks local HTTP, proxy `/events` through the local
HTTPS server (disable response buffering) and use that HTTPS URL.

Run `npm run test:datasender` for the projection and simulated TCP/SSE integration tests.

## Starting stream programs and local HTTPS server

SSL certificate setup and startup automation are now maintained in:

- [start-stream-programs-script](https://github.com/bamboechop/start-stream-programs-script)

Use that repository for:

- creating and refreshing local SSL certificates
- building and serving this overlay over local HTTPS
- starting Cider and OBS with the expected launch flags

## OBS Websocket connection in production

As long as the obs-stream-overlay application is running on the same machine as OBS the websocket connection can be established using `ws://127.0.0.1:4455` / `ws://localhost:4455`. It doesn't matter that the application itself is served via `https` as the mixed content policy includes an exception for localhost connections as those are generally seen as non-risky due to the fact that they are only accessible from the local machine.
