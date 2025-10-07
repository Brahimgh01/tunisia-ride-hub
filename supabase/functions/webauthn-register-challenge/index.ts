import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// This function returns a WebAuthn registration challenge for the frontend
serve(async (req) => {
  // TODO: Implement challenge generation using @simplewebauthn/server
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501,
  });
});
