import ActionItemsServices from "../../services/ai_services/action_items.services";
import BlockersService from "../../services/ai_services/blockers.services";

class ExecutionOrchestrateServices {
  private meetingId: string;
  protected actionItemsService: ActionItemsServices;
  protected blockersService: BlockersService;
  constructor(meetingId: string) {
    this.meetingId = meetingId;
    this.actionItemsService = new ActionItemsServices(this.meetingId);
    this.blockersService = new BlockersService(this.meetingId);
  }
  async persistExecutionResults(persistData: Record<string, any>) {
    const { actionItems, blockers } = persistData;
    const actionAddPayload = actionItems.add || [];
    const actionUpdatePayload = actionItems.update || [];
    const blockerAddPayload = blockers.add || [];
    const blockerUpdatePayload = blockers.update || [];
    try {
      if (actionAddPayload.length) {
        await this.actionItemsService.createAllActionItems(actionAddPayload);
      }
      if (actionUpdatePayload.length) {
        await this.actionItemsService.updateAllActionItems(actionUpdatePayload);
      }
      if (blockerAddPayload.length) {
        await this.blockersService.createAllBlockers(blockerAddPayload);
      }
      if (blockerUpdatePayload.length) {
        await this.blockersService.updateAllBlockers(blockerUpdatePayload);
      }
    } catch (error) {
      throw new Error(
        "Error persisting execution results: " +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  }
}

export default ExecutionOrchestrateServices;
