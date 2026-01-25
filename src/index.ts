import "dotenv/config";
import express from "express";
import slackRouter from "../models/meetings/slack/slack.routes.js";

const PORT = process.env.PORT || 8000;

const app = express();
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use("/slack", slackRouter);

app.use("/health", (req, res) => {
  res.send("Working good");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
