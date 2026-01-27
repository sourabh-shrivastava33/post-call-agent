import { prisma } from "../../config/prisma";
import { logger } from "../../shared/logger";

interface CreateEmailDraftInput {
  meetingId: string;
  to_original?: string | null;
  subject: string;
  interruption_id: string;
  original_body: string;
}

interface UpdateEmailBodyInput {
  meetingId: string;
  edited_body: string;
}

interface UpdateConfirmedEmailInput {
  meetingId: string;
  to_confirmed: string;
}

// ==================================================================================================//
// Email Draft table
// ==================================================================================================//

export async function getEmailDraftByMeetingId(meetingId: string) {
  try {
    return await prisma.emailDraft.findFirst({
      where: { meetingId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.log("Error fetching email draft " + JSON.stringify(error));
    throw error;
  }
}

export async function createEmailDraft({
  meetingId,
  to_original,
  subject,
  original_body,
  interruption_id,
}: CreateEmailDraftInput) {
  try {
    return await prisma.emailDraft.create({
      data: {
        meetingId,
        to_original: to_original ?? null,
        subject,
        original_body,
        interruption_id,
      },
    });
  } catch (error) {
    logger.log("Error creating email draft " + JSON.stringify(error));
    throw error;
  }
}

export async function updateEmailBody({
  meetingId,
  edited_body,
}: UpdateEmailBodyInput) {
  try {
    return await prisma.emailDraft.updateMany({
      where: { meetingId },
      data: { edited_body },
    });
  } catch (error) {
    logger.log("Error updating email body " + JSON.stringify(error));
    throw error;
  }
}

export async function updateConfirmedEmail({
  meetingId,
  to_confirmed,
}: UpdateConfirmedEmailInput) {
  try {
    return await prisma.emailDraft.updateMany({
      where: { meetingId },
      data: { to_confirmed },
    });
  } catch (error) {
    logger.log("Error updating confirmed email " + JSON.stringify(error));
    throw error;
  }
}

export async function getFinalEmailPayload(meetingId: string) {
  const draft = await getEmailDraftByMeetingId(meetingId);

  if (!draft) {
    throw new Error("Email draft not found");
  }

  const to = draft.to_confirmed ?? draft.to_original;

  if (!to) {
    throw new Error("Client email not confirmed");
  }

  return {
    to,
    subject: draft.subject,
    body: draft.edited_body ?? draft.original_body,
  };
}

export async function deleteEmailDraft(meetingId: string) {
  try {
    await prisma.emailDraft.deleteMany({
      where: { meetingId },
    });
  } catch (error) {
    logger.log("Error deleting email draft " + JSON.stringify(error));
  }
}

// ==================================================================================================//
// Email Interruption Table
// ==================================================================================================//

interface CreateEmailFollowUpInterruption {
  meetingId: string;
  toolName: string;
  to?: string;
  subject: string;
  body: string;
  expiresAt: Date;
}
export async function createEmailFollowUpInterruption({
  meetingId,
  subject,
  body,
  expiresAt,
  to,
  toolName,
}: CreateEmailFollowUpInterruption) {
  try {
    return await prisma.emailFollowUpInterruption.create({
      data: {
        meetingId,
        subject,
        expiresAt,
        toolName,
        body,
        to,
      },
    });
  } catch (error) {
    logger.log(
      "Error creating email followupInterruption " + JSON.stringify(error),
    );
    throw error;
  }
}

export async function findEmailInterruptionById(interruptionId: string) {
  try {
    return await prisma.emailFollowUpInterruption.findUnique({
      where: { id: interruptionId },
    });
  } catch (error) {
    logger.log(JSON.stringify(error));
    return null;
  }
}

export async function updateInterruptionStatus({
  interruptionId,
  status,
  decidedBy,
}: {
  interruptionId: string;
  status: "APPROVED" | "REJECTED" | "EXPIRED";
  decidedBy?: string;
}) {
  try {
    return await prisma.emailFollowUpInterruption.update({
      where: { id: interruptionId },
      data: {
        status,
        decidedAt: new Date(),
        ...(decidedBy ? { decidedBy } : {}),
      },
    });
  } catch (error) {
    logger.log("Error updating interruption status: " + JSON.stringify(error));
    throw error;
  }
}

export async function validateInterruptionNotExpired(
  interruptionId: string,
): Promise<boolean> {
  try {
    const interruption = await findEmailInterruptionById(interruptionId);
    if (!interruption) return false;

    const now = new Date();
    if (now > interruption.expiresAt) {
      // Auto-mark as expired
      await updateInterruptionStatus({
        interruptionId,
        status: "EXPIRED",
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.log("Error validating expiration: " + JSON.stringify(error));
    return false;
  }
}

export async function getEmailDraftByInterruptionId(
  interruptionId: string,
) {
  try {
    return await prisma.emailDraft.findFirst({
      where: { interruption_id: interruptionId },
    });
  } catch (error) {
    logger.log(
      "Error fetching email draft by interruption: " + JSON.stringify(error),
    );
    throw error;
  }
}

export async function updateEmailDraftFields({
  interruptionId,
  edited_subject,
  edited_body,
}: {
  interruptionId: string;
  edited_subject?: string;
  edited_body?: string;
}) {
  try {
    const updateData: any = {};
    if (edited_subject !== undefined) updateData.edited_subject = edited_subject;
    if (edited_body !== undefined) updateData.edited_body = edited_body;

    return await prisma.emailDraft.updateMany({
      where: { interruption_id: interruptionId },
      data: updateData,
    });
  } catch (error) {
    logger.log("Error updating email draft fields: " + JSON.stringify(error));
    throw error;
  }
}

export async function updateEmailDraftRecipient({
  interruptionId,
  to_confirmed,
}: {
  interruptionId: string;
  to_confirmed: string;
}) {
  try {
    return await prisma.emailDraft.updateMany({
      where: { interruption_id: interruptionId },
      data: { to_confirmed },
    });
  } catch (error) {
    logger.log(
      "Error updating email draft recipient: " + JSON.stringify(error),
    );
    throw error;
  }
}

export async function getCompleteEmailPayload(interruptionId: string) {
  const draft = await getEmailDraftByInterruptionId(interruptionId);

  if (!draft) {
    throw new Error("Email draft not found for interruption ID: " + interruptionId);
  }

  const to = draft.to_confirmed ?? draft.to_original;

  if (!to) {
    throw new Error("Client email not confirmed for interruption ID: " + interruptionId);
  }

  return {
    to,
    subject: draft.edited_subject ?? draft.subject,
    body: draft.edited_body ?? draft.original_body,
  };
}
