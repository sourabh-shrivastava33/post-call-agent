import express from "express";
import SlackController from "./slack.controller.js";

const router = express.Router();

router.post("/events", SlackController.handleEvent);

export default router;
