import type { Plugin } from 'vite';
import { handlePlotRequest } from './plot-gateway';

export function geminiScenePlugin(apiKey?: string): Plugin {
  let generating = false;
  return {
    name: 'local-gemini-scene',
    configureServer(server) {
      server.middlewares.use('/api/scene-plan', async (request, response) => {
        function send(status: number, body: unknown) {
          if (response.destroyed) return;
          response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify(body));
        }
        const host = request.headers.host ?? '';
        const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host);
        const loopbackPeer = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '');
        if (request.method !== 'POST' || !loopbackHost || !loopbackPeer || request.headers.origin !== `http://${host}`
          || request.headers['content-type']?.split(';')[0] !== 'application/json') {
          send(403, { error: 'Use the loopback page to generate a fictional scene.' });
          return;
        }
        if (generating) { send(429, { error: 'Scene planning is already in progress.' }); return; }
        let body: unknown;
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of request) {
            const bytes = Buffer.from(chunk);
            size += bytes.length;
            if (size > 10_000) throw new Error('Request too large.');
            chunks.push(bytes);
          }
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch { send(400, { error: 'Provide a bounded fictional scene prompt.' }); return; }
        if (generating) { send(429, { error: 'Scene planning is already in progress.' }); return; }
        generating = true;
        const disconnect = new AbortController();
        response.once('close', () => disconnect.abort());
        try {
          const result = await handlePlotRequest(body, apiKey, disconnect.signal);
          send(result.status, result.body);
        } finally { generating = false; }
      });
    },
  };
}
