import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
    return new Response(
        JSON.stringify({ message: 'Auto-clockout for stale sessions is disabled.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
});
