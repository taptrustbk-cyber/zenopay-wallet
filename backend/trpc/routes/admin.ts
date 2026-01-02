import { createClient } from "@supabase/supabase-js";
import * as z from "zod";
import { createTRPCRouter, adminProcedure } from "../create-context";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function sendApprovalEmail(
  userId: string,
  type: 'approval' | 'instant_activation',
  waitTimeMinutes?: number
) {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const emailFunctionUrl = `${supabaseUrl}/functions/v1/send-approval-email`;
    
    const response = await fetch(emailFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        userId,
        type,
        waitTimeMinutes,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send email:", errorText);
    } else {
      console.log("✅ Email sent successfully");
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

export const adminRouter = createTRPCRouter({
  approveUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Approving user:", input.userId);

      const waitTimeMinutes = 120;

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          can_deposit: true,
          can_withdraw: true,
        })
        .eq("id", input.userId);

      if (error) {
        console.error("Error approving user:", error);
        throw new Error(error.message);
      }

      console.log("User approved successfully:", input.userId);

      await sendApprovalEmail(input.userId, "approval", waitTimeMinutes);

      return { success: true };
    }),

  rejectUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Rejecting user:", input.userId);

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ status: "rejected" })
        .eq("id", input.userId);

      if (error) {
        console.error("Error rejecting user:", error);
        throw new Error(error.message);
      }

      console.log("User rejected successfully:", input.userId);
      return { success: true };
    }),

  activateUserNow: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Force activating user:", input.userId);

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          status: "active",
          force_active: true,
          approved_at: new Date().toISOString(),
          can_deposit: true,
          can_withdraw: true,
        })
        .eq("id", input.userId);

      if (error) {
        console.error("Error force activating user:", error);
        throw new Error(error.message);
      }

      console.log("User force activated successfully:", input.userId);

      await sendApprovalEmail(input.userId, "instant_activation");

      return { success: true };
    }),
});
