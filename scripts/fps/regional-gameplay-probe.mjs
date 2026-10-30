// Temporary authenticated staging-only client, deployed by verify-us-gameplay.mjs.
// It has no service-role, management, database or ticket-signing credentials.
export default {
  async fetch(request, env) {
    if (request.headers.get("Authorization") !== "Bearer " + env.TEST_TOKEN)
      return new Response("Forbidden", { status: 403 });
    if (request.method === "GET") return Response.json({ ready: true });
    const input = await request.json();
    const url = new URL(input.url);
    if (
      url.origin !== "https://pvpspinarena-fps-staging.pvpspinarena.workers.dev" ||
      !/^\/matches\/[a-f0-9-]{36}\/socket$/.test(url.pathname)
    )
      return new Response("Invalid staging socket", { status: 400 });
    const trace = await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text();
    const report = {
      region: env.TEST_REGION,
      ingressColo: request.cf?.colo,
      egressColo: /colo=([^\n]+)/.exec(trace)?.[1],
      snapshots: 0,
      liveSnapshots: 0,
      ackMs: [],
      snapshotGapMs: [],
      sent: 0,
      closeCode: null,
      errors: [],
    };
    const start = Date.now();
    const response = await fetch(url, {
      headers: {
        Upgrade: "websocket",
        Origin: "https://pvpspinarena-staging.pvpspinarena.workers.dev",
      },
    });
    const socket = response.webSocket;
    if (!socket)
      return Response.json(
        { error: "Socket admission failed", status: response.status },
        { status: 502 },
      );
    socket.accept();
    report.admissionMs = Date.now() - start;
    let seat,
      seq = 0,
      previous,
      timer;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === "welcome") seat = frame.seat;
        if (frame.type !== "snapshot") return;
        report.snapshots++;
        if (frame.state.phase !== "live" || !seat) return;
        report.liveSnapshots++;
        const now = Date.now();
        if (previous) report.snapshotGapMs.push(now - previous);
        previous = now;
        const ack = frame.state.players[seat].lastSeq;
        if (pending.has(ack)) report.ackMs.push(now - pending.get(ack));
        for (const n of pending.keys()) if (n <= ack) pending.delete(n);
      } catch {
        report.errors.push("Invalid gameplay frame");
      }
    });
    socket.addEventListener("error", () => report.errors.push("WebSocket transport error"));
    socket.addEventListener("close", (event) => {
      report.closeCode = event.code;
    });
    socket.send(JSON.stringify({ v: 1, type: "ready" }));
    timer = setInterval(() => {
      if (socket.readyState !== 1 || !seat) return;
      const n = ++seq;
      pending.set(n, Date.now());
      socket.send(
        JSON.stringify({
          v: 1,
          type: "input",
          seq: n,
          forward: Math.sin(n / 50) * 0.5,
          strafe: Math.cos(n / 50) * 0.5,
          yaw: seat === "A" ? Math.PI / 2 : -Math.PI / 2,
          pitch: 0,
          fire: n % 10 < 4,
          reload: n % 120 === 0,
          weapon: "rifle",
          jump: n % 100 === 0,
          sprint: false,
          crouch: n % 160 < 40,
        }),
      );
      report.sent++;
    }, 50);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } finally {
      clearInterval(timer);
      socket.close(1000, "Regional staging probe complete");
    }
    report.durationMs = Date.now() - start;
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  },
};
