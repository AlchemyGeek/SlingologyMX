import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseUser.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      console.error("Non-admin user attempted to delete user");
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Admin ${user.id} deleting user ${userId}`);

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Anonymize bug reports (set user_id to null instead of deleting)
    const { error: bugAnonymizeError } = await supabaseAdmin
      .from("bug_reports")
      .update({ user_id: null })
      .eq("user_id", userId);

    if (bugAnonymizeError) {
      console.error("Error anonymizing bug reports:", bugAnonymizeError);
      // Continue anyway - not critical
    } else {
      console.log("Bug reports anonymized");
    }

    // Step 2: Anonymize feature requests (set user_id to null instead of deleting)
    const { error: featureAnonymizeError } = await supabaseAdmin
      .from("feature_requests")
      .update({ user_id: null })
      .eq("user_id", userId);

    if (featureAnonymizeError) {
      console.error("Error anonymizing feature requests:", featureAnonymizeError);
      // Continue anyway - not critical
    } else {
      console.log("Feature requests anonymized");
    }

    // Step 3: Delete user data in order (respecting foreign key constraints)
    const tablesToDelete = [
      "maintenance_directive_compliance",
      "aircraft_directive_status",
      "directive_history",
      "notifications",
      "maintenance_logs",
      "directives",
      "subscriptions",
      "aircraft_counter_history",
      "aircraft_counters",
      "user_roles",
      "profiles",
    ];

    for (const table of tablesToDelete) {
      const column = table === "profiles" ? "id" : "user_id";
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables
      } else {
        console.log(`Deleted from ${table}`);
      }
    }

    // Step 4: Delete the auth user (this also invalidates all sessions)
    console.log(`Deleting auth user ${userId}`);
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return new Response(JSON.stringify({ error: "Failed to delete auth user: " + authDeleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully deleted user ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-delete-user:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
