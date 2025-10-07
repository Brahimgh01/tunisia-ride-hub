import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from '../_shared/cors.ts';

// The structure of the data that the trigger sends to this function
interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  table: string;
  record: {
    id: string;
    name: string;
    bucket_id: string;
    owner: string;
  };
  schema: string;
  old_record: any;
}

console.log("AI Simulator function deployed!");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  // 1. Get the file details from the trigger
  const payload: WebhookPayload = await req.json();
  const fileRecord = payload.record;
  const filePath = fileRecord.name;
  const driverId = filePath.split('/')[0]; // Assumes path is "user_id/license.jpg"

  console.log(`AI SIMULATOR: Processing file: ${filePath} for driver: ${driverId}`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 2. SIMULATE THE AI VERIFICATION
    // This is our built-in AI. It checks the file type to make a decision.
    console.log("AI SIMULATOR: Running analysis...");
    const allowedTypes = ['png', 'jpg', 'jpeg', 'pdf'];
    const fileExtension = filePath.split('.').pop()?.toLowerCase();

    let isVerified = false;
    let verificationStatus = 'REJECTED';

    if (fileExtension && allowedTypes.includes(fileExtension)) {
        isVerified = true;
        verificationStatus = 'VERIFIED';
        console.log(`AI SIMULATOR: File type ${fileExtension} is valid. Approving.`);
    } else {
        console.log(`AI SIMULATOR: File type ${fileExtension} is not valid. Rejecting.`);
    }

    // 3. Update the driver's profile with the AI's decision
    const { error: updateError } = await supabaseAdmin
      .from("driver_profiles")
      .update({
        id_document_verified: isVerified,
        id_document_verification_status: verificationStatus,
      })
      .eq("driver_id", driverId);

    if (updateError) {
      throw updateError;
    }
    
    console.log(`AI SIMULATOR: Successfully updated profile for driver: ${driverId} to status: ${verificationStatus}`);
    return new Response(JSON.stringify({ success: true, status: verificationStatus }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    });

  } catch (err) {
    console.error("AI SIMULATOR: Verification failed:", err);
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    });
  }
});