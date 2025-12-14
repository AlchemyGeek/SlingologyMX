import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codeId } = await req.json();

    if (!codeId || typeof codeId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid code ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current counter value
    const { data: accessCode, error: fetchError } = await supabase
      .from('access_codes')
      .select('counter')
      .eq('id', codeId)
      .single();

    if (fetchError || !accessCode) {
      console.error('Error fetching access code:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Access code not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only decrement if counter > 0 (not unlimited which is -1)
    if (accessCode.counter > 0) {
      const { error: updateError } = await supabase
        .from('access_codes')
        .update({ counter: accessCode.counter - 1 })
        .eq('id', codeId);

      if (updateError) {
        console.error('Error decrementing counter:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update counter' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Access code ${codeId} counter decremented from ${accessCode.counter} to ${accessCode.counter - 1}`);
    } else {
      console.log(`Access code ${codeId} has unlimited uses, not decrementing`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in decrement-access-code:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
