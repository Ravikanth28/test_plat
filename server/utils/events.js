// Tiny in-memory pub/sub used to push notifications to browsers in real time
// over Server-Sent Events (SSE). One process, many connections: each logged-in
// tab opens GET /api/notifications/stream and we keep its response object here,
// keyed by user id. When notify() saves a notification it calls emitToUser(),
// which writes an SSE frame to every open connection for that user.
//
// This is intentionally simple (no Redis / multi-instance fan-out): Render runs
// a single web instance on the free tier, so an in-memory map is enough. If the
// app is ever scaled to multiple instances, swap this for a shared bus.

// Map<userIdString, Set<res>>
const connections = new Map();

export function addClient(userId, res) {
  const key = String(userId);
  let set = connections.get(key);
  if (!set) {
    set = new Set();
    connections.set(key, set);
  }
  set.add(res);
}

export function removeClient(userId, res) {
  const key = String(userId);
  const set = connections.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) connections.delete(key);
}

// Write a named SSE event with a JSON payload to one connection.
function write(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* connection already gone — cleaned up on 'close' */
  }
}

// Fan a payload out to every open connection belonging to a user.
export function emitToUser(userId, event, data) {
  const set = connections.get(String(userId));
  if (!set || set.size === 0) return;
  for (const res of set) write(res, event, data);
}

// Send a comment line to keep proxies/load-balancers from closing idle SSE
// connections. Called on an interval from the route.
export function pingAll() {
  for (const set of connections.values()) {
    for (const res of set) {
      try {
        res.write(": ping\n\n");
      } catch {
        /* ignore */
      }
    }
  }
}
