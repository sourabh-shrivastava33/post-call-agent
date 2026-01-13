import { Request, Response } from "express";
import meetingsServices from "./meetings.services.js";
import OrchestratorAgent from "../../ai/agents/orchestrator_agent";
import startExecution from "../../ai/start_execution.js";

class MeetingsController {
  constructor() {}

  async scheduleMeeting(req: Request, res: Response) {
    const body = req.body;
    try {
      if (!body.meetingUrl || !body.startTime) {
        throw new Error("Missing required fields, meeting URL or start time");
      }
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

const start = await startExecution("cmjmx5owo00001glb6d0irc6xr");
export default new MeetingsController();
