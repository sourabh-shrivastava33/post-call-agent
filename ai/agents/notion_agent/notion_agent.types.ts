export interface NotionInputInterface {
  add: {
    externalId: string;
    fields: {
      title: boolean;
      summary: boolean;
      owner: boolean;
      dueDate: boolean;
      confidence: boolean;
      status: boolean;
      origin: boolean;
      externalId: boolean;
      sourceStartTime: boolean;
      sourceEndTime: boolean;
      meetingId: boolean;
      type: boolean;
    };
  }[];

  update: {
    externalId: string;
    fields: {
      title: boolean;
      summary: boolean;
      owner: boolean;
      dueDate: boolean;
      confidence: boolean;
      status: boolean;
    };
  }[];
}

export type NotionMergeInput<TUpdate> = {
  add: { externalId: string }[];
  update: (TUpdate & { id: string; externalId: string })[];
};

export const NOTION_UPDATE_FIELDS = [
  "summary",
  "owner",
  "dueDate",
  "confidence",
] as const;

export type NotionUpdatableField = (typeof NOTION_UPDATE_FIELDS)[number];
