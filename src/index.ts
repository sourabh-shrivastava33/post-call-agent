import "dotenv/config";
import express from "express";
import meetingRouter from "../models/meetings/meetings.routes";

const PORT = process.env.PORT || 8000;

const app = express();
app.use(express.json());

app.use("/meeting", meetingRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
