import http from 'node:http';

const port = Number(process.env.LINKET_AI_COPY_PROXY_PORT ?? 18085);
const upstreamPort = Number(process.env.LINKET_AI_COPY_UPSTREAM_PORT ?? 18087);
const upstreamHost = process.env.LINKET_AI_COPY_UPSTREAM_IP ?? '';

if (process.env.LINKET_ISOLATED_E2E !== '1'
    || port !== 18085
    || upstreamPort !== 18087
    || !/^172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}$/.test(upstreamHost)) {
  throw new Error('AI copy proxy requires explicitly isolated E2E and a private Docker-bridge upstream.');
}

// Preserve the browser Host and Origin/Referer so Laravel's real CSRF and
// same-origin API authorization checks remain enabled.
const server = http.createServer((request, response) => {
  const forwarded = http.request({
    host: upstreamHost,
    port: upstreamPort,
    method: request.method,
    path: request.url,
    headers: request.headers,
  }, upstream => {
    response.writeHead(upstream.statusCode ?? 502, upstream.headers);
    upstream.pipe(response);
  });
  forwarded.on('error', () => {
    if (!response.headersSent) response.writeHead(502);
    response.end('Isolated Laravel test server unavailable');
  });
  request.pipe(forwarded);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`isolated ai-copy proxy ready on http://127.0.0.1:${port}\n`);
});
