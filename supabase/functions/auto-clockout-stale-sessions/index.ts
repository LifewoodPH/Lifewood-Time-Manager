import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

serve(async (req) => {
    try {
        // Initialize Supabase client with service role key for admin access
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Calculate the stale threshold timestamp
        const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

        console.log(`Checking for stale sessions with last_heartbeat before: ${staleThreshold}`);

        // Find all open sessions with stale heartbeats
        const { data: staleSessions, error: fetchError } = await supabaseClient
            .from('attendance')
            .select('id, user_id, clock_in, last_heartbeat')
            .is('clock_out', null)
            .lt('last_heartbeat', staleThreshold);

        if (fetchError) {
            console.error('Error fetching stale sessions:', fetchError);
            throw fetchError;
        }

        if (!staleSessions || staleSessions.length === 0) {
            console.log('No stale sessions found');
            return new Response(
                JSON.stringify({ message: 'No stale sessions found', count: 0 }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        console.log(`Found ${staleSessions.length} stale session(s)`);

        // Clock out each stale session
        const clockOutPromises = staleSessions.map(async (session) => {
            const clockOutTime = session.last_heartbeat || new Date().toISOString();
            const clockInTime = new Date(session.clock_in).getTime();
            const clockOutTimeMs = new Date(clockOutTime).getTime();
            const durationMs = clockOutTimeMs - clockInTime;
            const durationSeconds = Math.floor(durationMs / 1000);

            // Format duration as HH:MM:SS
            const hours = Math.floor(durationSeconds / 3600);
            const minutes = Math.floor((durationSeconds % 3600) / 60);
            const seconds = durationSeconds % 60;
            const totalTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            const { error: updateError } = await supabaseClient
                .from('attendance')
                .update({
                    clock_out: clockOutTime,
                    total_time: totalTime,
                    notes: 'Automatically clocked out - connection lost',
                })
                .eq('id', session.id);

            if (updateError) {
                console.error(`Error clocking out session ${session.id}:`, updateError);
                return { id: session.id, success: false, error: updateError };
            }

            console.log(`Clocked out session ${session.id} for user ${session.user_id}`);
            return { id: session.id, success: true };
        });

        const results = await Promise.all(clockOutPromises);
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return new Response(
            JSON.stringify({
                message: 'Stale session check complete',
                totalStale: staleSessions.length,
                successfulClockOuts: successCount,
                failedClockOuts: failureCount,
                results: results,
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
