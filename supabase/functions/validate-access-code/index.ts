import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (resets on function cold start, but provides basic protection)
const rateLimitMap = new Map<string, { attempts: number; lockoutUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    
    // Check rate limit
    const rateData = rateLimitMap.get(clientIP);
    if (rateData) {
      if (rateData.lockoutUntil > now) {
        const remainingMs = rateData.lockoutUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        console.log(`Rate limited IP ${clientIP}, ${remainingMinutes} minutes remaining`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Too many attempts. Please try again later.',
            lockedOut: true,
            remainingMinutes 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      // Reset if lockout expired
      if (rateData.lockoutUntil <= now && rateData.attempts >= MAX_ATTEMPTS) {
        rateLimitMap.delete(clientIP);
      }
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string' || code.length !== 5) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the access code
    const { data: accessCode, error } = await supabase
      .from('access_codes')
      .select('id, code, counter')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ valid: false, error: 'Validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Code not found or counter is 0
    if (!accessCode || accessCode.counter === 0) {
      // Increment failed attempts
      const currentData = rateLimitMap.get(clientIP) || { attempts: 0, lockoutUntil: 0 };
      currentData.attempts += 1;
      
      if (currentData.attempts >= MAX_ATTEMPTS) {
        currentData.lockoutUntil = now + LOCKOUT_DURATION_MS;
        console.log(`IP ${clientIP} locked out after ${MAX_ATTEMPTS} failed attempts`);
      }
      
      rateLimitMap.set(clientIP, currentData);
      
      const remainingAttempts = MAX_ATTEMPTS - currentData.attempts;
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: accessCode?.counter === 0 ? 'Access code has been fully used' : 'Invalid access code',
          remainingAttempts: Math.max(0, remainingAttempts)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid code found - reset rate limit on success
    rateLimitMap.delete(clientIP);
    
    console.log(`Access code validated successfully for IP ${clientIP}`);
    
    return new Response(
      JSON.stringify({ 
        valid: true, 
        codeId: accessCode.id,
        hasUnlimitedUses: accessCode.counter === -1
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-access-code:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
