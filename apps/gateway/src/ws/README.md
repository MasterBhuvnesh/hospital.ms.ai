# apps/gateway/src/ws

WebSocket upgrade and fanout.

Services publish queue events to **Redis pub/sub**; every gateway replica fans out to its own connected sockets. That indirection stops being optional the moment the gateway has more than one replica.

Clients send subscribe and heartbeat frames, reconnect with exponential backoff, and **fall back to 5-second polling**. Hospital wifi drops constantly and the queue screen must never look frozen.
