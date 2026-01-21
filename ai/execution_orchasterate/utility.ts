import {
  NOTION_UPDATE_FIELDS,
  NotionInputInterface,
  NotionMergeInput,
} from "../agents/notion_agent/notion_agent.types";

export function mergeItemWithNotionPayload<TUpdate>(
  items: NotionMergeInput<TUpdate>,
  notionAddArr: NotionInputInterface["add"],
  notionUpdateArr: NotionInputInterface["update"],
): void {
  if (items.add?.length) {
    for (const item of items.add) {
      notionAddArr.push({
        externalId: item.externalId,
        fields: {
          confidence: true,
          dueDate: true,
          externalId: true,
          origin: true,
          owner: true,
          sourceEndTime: true,
          sourceStartTime: true,
          status: true,
          summary: true,
          type: true,
          title: true,
          meetingId: true,
        },
      });
    }
  }

  if (items.update?.length) {
    for (const item of items.update) {
      const { id, externalId, ...rest } = item;

      const fields: NotionInputInterface["update"][number]["fields"] = {
        confidence: false,
        dueDate: false,
        owner: false,
        status: false,
        summary: false,
        title: false,
      };

      for (const key of NOTION_UPDATE_FIELDS) {
        if (key in rest) {
          fields[key] = true;
        } else {
          fields[key] = false;
        }
      }

      notionUpdateArr.push({
        externalId: externalId,
        fields,
      });
    }
  }
}
