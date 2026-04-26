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
    // Require authentication: verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use anon client with the user's JWT to identify them
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const authenticatedUserId = claimsData.claims.sub as string;

    const { codeId, userId } = await req.json();

    if (!codeId || typeof codeId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid code ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If userId is provided, it must match the authenticated user (no impersonation)
    if (userId && userId !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client for bypassing RLS on access_codes/profiles updates
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current counter value and code
    const { data: accessCode, error: fetchError } = await supabase
      .from('access_codes')
      .select('counter, code, use_count')
      .eq('id', codeId)
      .single();

    if (fetchError || !accessCode) {
      console.error('Error fetching access code:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Access code not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always increment use_count, only decrement counter if > 0 (not unlimited which is -1)
    const updateData: { counter?: number; use_count: number } = {
      use_count: (accessCode.use_count || 0) + 1
    };
    
    if (accessCode.counter > 0) {
      updateData.counter = accessCode.counter - 1;
    }

    const { error: updateError } = await supabase
      .from('access_codes')
      .update(updateData)
      .eq('id', codeId);

    if (updateError) {
      console.error('Error updating access code:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update access code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Access code ${accessCode.code} use_count incremented to ${(accessCode.use_count || 0) + 1}`);
    if (accessCode.counter > 0) {
      console.log(`Access code counter decremented from ${accessCode.counter} to ${accessCode.counter - 1}`);
    }

    // Update user profile with the access code used during registration
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ access_code: accessCode.code })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile with access code:', profileError);
        // Don't fail the whole request, just log the error
      } else {
        console.log(`Profile ${userId} updated with access code ${accessCode.code}`);
      }
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
