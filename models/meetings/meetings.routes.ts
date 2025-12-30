import express from "express";
import MeetingsController from "./meetings.controller.js";
const router = express.Router();

router.post("/start", MeetingsController.scheduleMeeting);

export default router;
