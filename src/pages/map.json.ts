import type { APIRoute } from 'astro';
import { mapPayload } from '../lib/journey';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(mapPayload()), { headers: { 'Content-Type': 'application/json' } });
