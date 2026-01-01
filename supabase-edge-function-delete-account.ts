// @ts-nocheck
/* eslint-disable */

// ⚠️ REFERENCE ONLY - NOT PART OF REACT NATIVE APP
// This file is for Supabase Edge Function deployment reference
// TypeScript errors are expected - this uses Deno runtime, not Node.js
//
// DEPLOYMENT INSTRUCTIONS:
// 
// 1. Make sure you have Supabase CLI installed:
//    npm install -g supabase
//
// 2. Login to Supabase:
//    supabase login
//
// 3. Link your project:
//    supabase link --project-ref YOUR_PROJECT_REF
//
// 4. Create the function directory:
//    mkdir -p supabase/functions/delete-account
//
// 5. Copy this code to: supabase/functions/delete-account/index.ts
//
// 6. Deploy the function:
//    supabase functions deploy delete-account --no-verify-jwt
//
// 7. Make sure your SUPABASE_SERVICE_ROLE_KEY is set in Supabase dashboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const jwt = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(jwt)

    if (error || !user) {
      console.error("User validation error:", error)
      return new Response(
        JSON.stringify({ error: "Invalid user" }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const userId = user.id
    console.log(`🔥 Starting account deletion for user: ${userId}`)

    // Delete user-related data in order
    console.log("Deleting KYC documents...")
    await supabase.from("kyc_documents").delete().eq("user_id", userId)

    console.log("Deleting KYC requests...")
    await supabase.from("kyc_requests").delete().eq("user_id", userId)

    console.log("Deleting transactions...")
    await supabase.from("transactions").delete().eq("user_id", userId)

    console.log("Deleting wallets...")
    await supabase.from("wallets").delete().eq("user_id", userId)

    console.log("Deleting profile...")
    await supabase.from("profiles").delete().eq("id", userId)

    // Delete auth user (FINAL)
    console.log("Deleting auth user...")
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError)
      throw deleteError
    }

    console.log(`✅ Account deleted successfully: ${userId}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    console.error("Delete account error:", e)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
