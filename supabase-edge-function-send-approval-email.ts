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
//    mkdir -p supabase/functions/send-approval-email
//
// 5. Copy this code to: supabase/functions/send-approval-email/index.ts
//
// 6. Deploy the function:
//    supabase functions deploy send-approval-email
//
// 7. Set your Resend API key in Supabase dashboard:
//    supabase secrets set RESEND_API_KEY=re_xxxxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

interface EmailRequest {
  userId: string
  type: 'approval' | 'instant_activation'
  waitTimeMinutes?: number
}

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
    
    const token = authHeader.replace("Bearer ", "")
    if (token !== supabaseServiceKey) {
      console.error("Invalid service role key")
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid credentials" }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: EmailRequest = await req.json()
    const { userId, type, waitTimeMinutes } = body

    console.log(`📧 Sending ${type} email to user: ${userId}`)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single()

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError)
      throw new Error("User profile not found")
    }

    const { email, full_name } = profile

    if (!email) {
      throw new Error("User email not found")
    }

    let subject: string
    let htmlContent: string

    if (type === 'approval') {
      const waitMinutes = waitTimeMinutes || 120
      const hours = Math.floor(waitMinutes / 60)
      const minutes = waitMinutes % 60
      const timeString = hours > 0 
        ? `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`
        : `${minutes} minute${minutes > 1 ? 's' : ''}`

      subject = "Your ZenoPay Account Has Been Approved ✅"
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Account Approved!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #111827; font-size: 16px; line-height: 24px;">
                Hi <strong>${full_name || 'there'}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 24px;">
                Great news! Your ZenoPay account verification has been completed successfully. 🎉
              </p>
              
              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <p style="margin: 0 0 10px; color: #1E40AF; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Account Activation
                </p>
                <p style="margin: 0; color: #1E3A8A; font-size: 18px; font-weight: 700;">
                  Your account will be fully activated in ${timeString}
                </p>
              </div>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 24px;">
                Once activated, you'll be able to access all ZenoPay features including:
              </p>
              
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #374151; font-size: 15px; line-height: 28px;">
                <li>Send and receive money instantly</li>
                <li>Crypto deposits and withdrawals</li>
                <li>Real-time transaction tracking</li>
                <li>Secure wallet management</li>
              </ul>
              
              <p style="margin: 0 0 20px; color: #6B7280; font-size: 14px; line-height: 22px;">
                You'll receive another notification when your account is ready to use.
              </p>
              
              <p style="margin: 0 0 10px; color: #111827; font-size: 16px; line-height: 24px;">
                Thank you for choosing ZenoPay!
              </p>
              
              <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 22px;">
                The ZenoPay Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px; color: #6B7280; font-size: 12px; line-height: 18px;">
                This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 11px; line-height: 16px;">
                © ${new Date().getFullYear()} ZenoPay. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    } else {
      subject = "Your ZenoPay Account is Now Active 🎉"
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Active</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're All Set!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #111827; font-size: 16px; line-height: 24px;">
                Hi <strong>${full_name || 'there'}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 24px;">
                Excellent news! Your ZenoPay account is now <strong>fully activated</strong> and ready to use. 🎉
              </p>
              
              <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <p style="margin: 0 0 10px; color: #065F46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Status
                </p>
                <p style="margin: 0; color: #047857; font-size: 18px; font-weight: 700;">
                  ✓ Account Active - You can login now
                </p>
              </div>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 24px;">
                You can now access all ZenoPay features immediately:
              </p>
              
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #374151; font-size: 15px; line-height: 28px;">
                <li>Send and receive money instantly</li>
                <li>Crypto deposits and withdrawals</li>
                <li>Real-time transaction tracking</li>
                <li>Secure wallet management</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://zenopay.app" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  Open ZenoPay
                </a>
              </div>
              
              <p style="margin: 0 0 10px; color: #111827; font-size: 16px; line-height: 24px;">
                Welcome to ZenoPay!
              </p>
              
              <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 22px;">
                The ZenoPay Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px; color: #6B7280; font-size: 12px; line-height: 18px;">
                This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 11px; line-height: 16px;">
                © ${new Date().getFullYear()} ZenoPay. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }

    const emailData = {
      from: 'ZenoPay <noreply@zenopay.app>',
      to: [email],
      subject,
      html: htmlContent,
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error("Resend API error:", errorData)
      throw new Error(`Failed to send email: ${errorData}`)
    }

    const result = await emailResponse.json()
    console.log("✅ Email sent successfully:", result)

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    console.error("Send email error:", e)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
