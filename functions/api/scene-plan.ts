import { handlePlotRequest } from '../../server/plot-gateway';

interface Context {
  request: Request;
  env: { GEMINI_API_KEY?: string; GEMINI_FREE_TIER?: string };
}

export async function onRequest({ request, env }: Context) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'POST' || request.headers.get('origin') !== new URL(request.url).origin
    || request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return Response.json({ error: 'Submit a fictional scene from this site.' }, { status: 403, headers });
  }
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'A prompt is required.' }, { status: 400, headers });
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10_000) {
        await reader.cancel();
        return Response.json({ error: 'The request is too large.' }, { status: 413, headers });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch { return Response.json({ error: 'Could not read the prompt.' }, { status: 400, headers }); }
  let body: unknown;
  try { body = JSON.parse(text); }
  catch { return Response.json({ error: 'Invalid scene request.' }, { status: 400, headers }); }
  const result = await handlePlotRequest(body, env.GEMINI_FREE_TIER === 'true' ? env.GEMINI_API_KEY : undefined, request.signal);
  return Response.json(result.body, { status: result.status, headers });
}
