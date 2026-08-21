import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token for RLS
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { email, role, organization_id } = await req.json();

    if (!email || !role || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing email, role, or organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this org (owner/manager)
    const { data: accessCheck } = await userClient.rpc("is_org_owner_or_manager", {
      _org_id: organization_id,
    });

    if (!accessCheck) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to invite staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the invitation using the user's client (RLS)
    const { data: invitation, error: invError } = await userClient
      .from("staff_invitations")
      .insert({
        organization_id,
        email: email.toLowerCase().trim(),
        role,
        invited_by: userId,
      })
      .select()
      .single();

    if (invError) {
      return new Response(
        JSON.stringify({ error: invError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to send invite email via Auth
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email.toLowerCase().trim(), {
        data: {
          invited_to_org: organization_id,
          assigned_role: role,
        },
      });

    if (inviteError) {
      // If user already exists, that's okay - just keep the invitation record
      console.log("Invite email note:", inviteError.message);
    }

    // Get org name for response
    const { data: org } = await userClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        message: `Invitation sent to ${email} as ${role} for ${org?.name || "your store"}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
