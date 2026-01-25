import meetingsServices from "./meetings.services.js";

class MeetingsController {
  async scheduleMeeting(meetingUrl: string): Promise<void> {
    if (!meetingUrl) {
      throw new Error("Missing required field: meetingUrl");
    }

    await meetingsServices.startMeeting({
      meetingUrl,
      startTime: new Date(),
    });
  }
}

export default new MeetingsController();
