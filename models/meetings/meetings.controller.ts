import { Request, Response } from "express";
import meetingsServices from "./meetings.services.js";
import OrchestratorAgent from "../../ai/agents/orchestrator_agent";
import startExecution from "../../ai/start_execution.js";
import NotionExecutionAgent from "../../ai/agents/notion_agent/index.js";
import { NotionInputInterface } from "../../ai/agents/notion_agent/notion_agent.types.js";

class MeetingsController {
  constructor() {}

  async scheduleMeeting(req: Request, res: Response) {
    const body = req.body;
    try {
      if (!body.meetingUrl || !body.startTime) {
        throw new Error("Missing required fields, meeting URL or start time");
      }

      const testNotionPayload = {
        add: [
          {
            externalId: "54c2caed-73ee-475a-a479-9d40433c1e8c",
            fields: {
              title: true,
              summary: true,
              owner: true,
              dueDate: true,
              confidence: true,
              status: true,
              origin: true,
              externalId: true,
              meetingId: true,
              type: true,
              sourceStartTime: true,
              sourceEndTime: true,
            },
          },
          {
            externalId: "14437c04-4b80-4eaa-8da8-497f9c808417",
            fields: {
              title: true,
              summary: true,
              owner: true,
              dueDate: true,
              confidence: true,
              status: true,
              origin: true,
              externalId: true,
              meetingId: true,
              type: true,
              sourceStartTime: true,
              sourceEndTime: true,
            },
          },
          {
            externalId: "642c57f0-cfbb-4e98-b22c-6471940430ea",
            fields: {
              title: true,
              summary: true,
              owner: true,
              dueDate: true,
              confidence: true,
              status: true,
              origin: true,
              externalId: true,
              meetingId: true,
              type: true,
              sourceStartTime: true,
              sourceEndTime: true,
            },
          },
          {
            externalId: "61c2b662-5cd0-449b-8413-343243f5290e",
            fields: {
              title: true,
              summary: true,
              owner: true,
              dueDate: true,
              confidence: true,
              status: true,
              origin: true,
              externalId: true,
              meetingId: true,
              type: true,
              sourceStartTime: true,
              sourceEndTime: true,
            },
          },
          {
            externalId: "abece8ec-3903-4e34-9706-d7d2d724ebf5",
            fields: {
              title: true,
              summary: true,
              owner: true,
              dueDate: true,
              confidence: true,
              status: true,
              origin: true,
              externalId: true,
              meetingId: true,
              type: true,
              sourceStartTime: true,
              sourceEndTime: true,
            },
          },
        ],
        update: [],
      } satisfies NotionInputInterface;

      const notion = new NotionExecutionAgent();
      await notion.run(testNotionPayload);
      await meetingsServices.startMeeting({
        meetingUrl: body.meetingUrl,
        startTime: new Date(body.startTime),
      });
      res.status(200).json({ message: "Meeting scheduled successfully" });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}

export default new MeetingsController();
