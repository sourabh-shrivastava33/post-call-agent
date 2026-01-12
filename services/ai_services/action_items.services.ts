import { prisma } from "../../config/prisma";
import { UpdateActionItemsInterface } from "./ai_services.types";

class ActionItemsServices {
  private meetingId: string;
  constructor(meetingId: string) {
    this.meetingId = meetingId;
  }
  async getAllActionItemsByMeetingId() {
    try {
      const action_items = await prisma.executionArtifact.findMany({
        where: { meetingId: this.meetingId },
      });
      return action_items;
    } catch (error) {
      console.log("Error while fetching all the action items");
    }
  }

  async updateActionItems({
    id,
    dueDate,
    owner,
    confidence,
  }: UpdateActionItemsInterface) {
    let updateData: Partial<UpdateActionItemsInterface> = {};
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate;
    }
    if (owner !== undefined) {
      updateData.owner = owner;
    }

    if (confidence !== undefined) {
      updateData.confidence = confidence;
    }

    try {
      await prisma.executionArtifact.update({
        where: { id: id },
        data: { ...updateData },
      });
    } catch (error) {}
  }
}

export default ActionItemsServices;
