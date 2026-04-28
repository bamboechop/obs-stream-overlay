# obs-stream-overlay

## Starting stream programs and local HTTPS server

SSL certificate setup and startup automation are now maintained in:

- [start-stream-programs-script](https://github.com/bamboechop/start-stream-programs-script)

Use that repository for:

- creating and refreshing local SSL certificates
- building and serving this overlay over local HTTPS
- starting Cider and OBS with the expected launch flags

## OBS Websocket connection in production

As long as the obs-stream-overlay application is running on the same machine as OBS the websocket connection can be established using `ws://127.0.0.1:4455` / `ws://localhost:4455`. It doesn't matter that the application itself is served via `https` as the mixed content policy includes an exception for localhost connections as those are generally seen as non-risky due to the fact that they are only accessible from the local machine.
