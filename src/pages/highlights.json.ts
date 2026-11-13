import type { APIRoute } from 'astro';
import { getClips } from '../lib/journey';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(getClips()), { headers: { 'Content-Type': 'application/json' } });
