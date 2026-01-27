import { logger } from "../../shared/logger";
import { sendFollowupEmail } from "./send_follow_up_email";
import {
  findEmailInterruptionById,
  getCompleteEmailPayload,
  validateInterruptionNotExpired,
  updateInterruptionStatus,
} from "../ai_services/followup_agent.services";

/**
 * Executes the email tool after human approval
 * This is the orchestration layer that:
 * 1. Validates the interruption is still valid
 * 2. Retrieves the final email payload (with edits if any)
 * 3. Calls the actual sendFollowupEmail tool
 * 4. Updates the interruption status
 * 5. Returns comprehensive result
 */
export async function executeEmailTool({
  interruptionId,
  decidedBy,
}: {
  interruptionId: string;
  decidedBy: string;
}): Promise<{
  success: boolean;
  message: string;
  emailResult?: any;
}> {
  try {
    logger.log(`📧 Starting email tool execution for interruption: ${interruptionId}`);

    // 1️⃣ Validate interruption exists
    const interruption = await findEmailInterruptionById(interruptionId);
    if (!interruption) {
      logger.error(`❌ Interruption not found: ${interruptionId}`);
      return {
        success: false,
        message: "Email confirmation not found. It may have been deleted.",
      };
    }

    // 2️⃣ Check if already processed
    if (interruption.status !== "PENDING") {
      logger.log(`⚠️ Interruption already processed: ${interruption.status}`);
      return {
        success: false,
        message: `This email has already been ${interruption.status.toLowerCase()}.`,
      };
    }

    // 3️⃣ Validate not expired
    const isValid = await validateInterruptionNotExpired(interruptionId);
    if (!isValid) {
      logger.log(`⏰ Interruption expired: ${interruptionId}`);
      return {
        success: false,
        message:
          "This confirmation has expired. Email was not sent.",
      };
    }

    // 4️⃣ Get final email payload (edited vs original)
    let emailPayload;
    try {
      emailPayload = await getCompleteEmailPayload(interruptionId);
    } catch (error: any) {
      logger.error(`❌ Failed to get email payload: ${error.message}`);
      return {
        success: false,
        message: error.message || "Failed to retrieve email data.",
      };
    }

    // 5️⃣ Execute the actual tool (sendFollowupEmail)
    logger.log(`📤 Sending email to: ${emailPayload.to}`);
    const emailResult = await sendFollowupEmail({
      to: emailPayload.to,
      subject: emailPayload.subject,
      body: emailPayload.body,
      meeting_id: interruption.meetingId,
    });

    // 6️⃣ Check if email send was successful
    if (emailResult.status !== "sent") {
      logger.error(`❌ Email send failed: ${emailResult.reason}`);
      // Don't mark as approved if email failed
      return {
        success: false,
        message: `Email send failed: ${emailResult.reason}`,
        emailResult,
      };
    }

    // 7️⃣ Mark as approved
    await updateInterruptionStatus({
      interruptionId,
      status: "APPROVED",
      decidedBy,
    });

    logger.log(`✅ Email sent successfully for interruption: ${interruptionId}`);

    return {
      success: true,
      message: `Email sent successfully to ${emailPayload.to}`,
      emailResult,
    };
  } catch (error: any) {
    logger.error(`❌ Email tool execution failed: ${error.message}`, error);
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
    };
  }
}
