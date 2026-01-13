# Post-Call Agent

A TypeScript-based application that automatically captures, processes, and analyzes meeting data from Google Meet to generate transcripts and actionable insights.

## 🎯 Overview

Post-Call Agent is an intelligent meeting intelligence platform that:

- **Captures** live meeting sessions from Google Meet using automated bot agents
- **Processes** raw caption data into structured transcript segments
- **Extracts** actionable artifacts including action items, decisions, and summary points
- **Stores** all processed data in a PostgreSQL database for further analysis

## ⚠️ Project Status

This repository is a personal project maintained by the author and is not currently open for external contributions. The codebase is being developed as a potential commercial service offering for agencies — if you are interested in licensing, partnership, or agency services built on this project, please contact the author (Sourabh Shrivastava) for commercial enquiries.

If you are exploring the code privately, you may fork it for your own internal use, but please do not submit pull requests to this repository at this time.

### Contact / Commercial enquiries

If you'd like to discuss licensing or agency services built on this project, contact the author:

- **Sourabh Shrivastava** — please provide preferred contact (email or business URL) and I'll add it here.

For now add your contact info by replacing the line above or tell me the email/URL and I'll update the README.

## ✨ Key Features

- **Automated Meeting Capture**: Deploys Playwright-based bots to join and monitor Google Meet sessions
- **Real-time Transcription**: Captures captions and converts them into structured transcript segments
- **Data Processing Pipeline**: Processes raw caption events into meaningful transcript data
- **Artifact Extraction**: Identifies and extracts action items, decisions, and key discussion points
- **Session Management**: Tracks meeting bot sessions, join states, and execution artifacts
- **REST API**: Express-based API for meeting management and transcript access

## 🏗️ Architecture

### Core Components

- **Bot Layer** (`/bot`): Handles automated browser-based meeting capture

  - `GoogleMeetBot`: Main bot class for Google Meet interaction
  - Browser session management
  - Caption event monitoring

- **Capture Service** (`/capture`): Orchestrates the meeting capture workflow

  - Bot initialization and lifecycle management
  - Meeting status tracking
  - Execution artifact collection

- **Transcript Processing** (`/transcript`): Processes raw data to transcripts

  - `TranscriptServices`: Manages transcript segment creation
  - `TranscriptController`: Coordinates transcript processing logic
  - `AggregateProcessor`: Aggregates and processes caption events

- **Models** (`/models`): Database models and services

  - Meeting management
  - Bot session tracking
  - Execution artifact storage

- **Database**: PostgreSQL with Prisma ORM
  - Stores meetings, transcripts, bot sessions, and artifacts

## 📊 Data Processing Flow

```
Google Meet Meeting
        ↓
   (Bot Capture)
        ↓
  Caption Events
        ↓
(Aggregate Processor)
        ↓
  Raw Transcript Data
        ↓
(Transcript Service)
        ↓
Structured Transcript Segments
        ↓
(Database Storage)
        ↓
REST API Access
```

## 🛠️ Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Browser Automation**: Playwright
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Development**: tsx, ts-node

## 📦 Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL database
- Google account credentials (for bot)

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/post-call-agent.git
cd post-call-agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/post_call_agent

# Bot Credentials
BOT_EMAIL=your-bot-email@gmail.com
BOT_PASSWORD=your-bot-password

# Server
PORT=8000
```

### Database Setup

```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio
npx prisma studio
```

### Running the Application

```bash
# Start the development server
npm run dev
# or
npx tsx ./src/index.ts
```

The server will start on `http://localhost:8000`

## 📡 API Endpoints

### Meetings

- `GET /meeting` - List all meetings
- `POST /meeting` - Create a new meeting
- `GET /meeting/:id` - Get meeting details
- `POST /meeting/:id/capture` - Start capturing a meeting

### Transcripts

- `GET /transcript/:meetingId` - Get meeting transcript
- `GET /transcript/:meetingId/segments` - Get transcript segments

## 🗄️ Database Schema

### Core Models

**Meeting**

- Stores meeting metadata and status
- Links to bot sessions, transcripts, and artifacts

**TranscriptSegment**

- Individual transcript entries with speaker, timestamp, and content
- Source type (CAPTION, SPEECH_RECOGNITION, etc.)

**MeetingBotSession**

- Tracks bot participation in meetings
- Records join/leave events and success status

**ExecutionArtifact**

- Stores extracted action items, decisions, and summaries
- Includes confidence levels

**CaptionEvent**

- Raw caption data from Google Meet

## 📝 Development

### Project Structure

```
post-call-agent/
├── src/                    # Application entry point
├── bot/                    # Bot implementation
├── capture/                # Capture service
├── transcript/             # Transcript processing
├── models/                 # Database models
├── config/                 # Configuration files
├── generated/              # Generated Prisma client
└── prisma/                 # Database schema & migrations
```

### Scripts

```bash
npm run dev         # Run development server
npm run build       # Build TypeScript
npm test            # Run tests (when configured)
```

## 🔄 Data Processing Pipeline

1. **Meeting Initiation**: User creates a meeting record with Google Meet URL
2. **Bot Deployment**: CaptureService launches GoogleMeetBot instance
3. **Caption Capture**: Bot monitors and collects caption events in real-time
4. **Aggregation**: AggregateProcessor combines caption events by speaker/timestamp
5. **Transcript Creation**: TranscriptService creates structured segment records
6. **Artifact Extraction**: Execution artifacts are identified and stored
7. **Database Persistence**: All data is persisted to PostgreSQL
8. **API Access**: Processed data is accessible via REST endpoints

## 🔐 Security Considerations

- Bot credentials should never be committed to version control
- Use environment variables for sensitive data
- Implement proper authentication for API endpoints
- Consider adding rate limiting and API key management
- Database credentials should be secured in environment variables

## 📄 License

ISC

## 👤 Author

Sourabh Shrivastava

For issues and questions, please open an issue on GitHub.

---

**Status**: The application is currently in development. Core data processing from raw caption to structured transcript is functional.

## 🛠️ Recent Work (what we implemented)

These notes document the important changes, reasoning, and handling improvements made while developing the extraction + reconciliation pipeline. They are intended to help maintainers, reviewers, and future contributors understand key decisions and operational steps.

- **Robust orchestrator parsing**: the orchestrator now safely handles stringified JSON and JSON inside code blocks returned by LLM agents. This prevents Zod parse failures when an agent returns a JSON payload as a string.

- **Extraction ↔ Reconciliation parity**: the `ActionItemsAgent` and `BlockersAgent` behavior was aligned — both produce consistent handoff payloads, include retry logic, and provide the original extractor handoff input for safe fallback when reconciliation declines to add items.

- **Reconciliation fallback**: if a reconciliation agent (safety/conservative) returns `no_safe_actions`, the orchestrator now falls back to persisting the original extracted items so the pipeline doesn't drop valuable suggestions silently.

- **Timestamps enrichment**: when extracted artifacts do not include `sourceStartTime` / `sourceEndTime`, the orchestrator attempts to match the artifact `source` text against transcript segments and attach `sourceStartTime`/`sourceEndTime` ranges to improve traceability.

- **Deterministic model settings**: model parameter sets were harmonized (removed unsupported sampling params for gpt-5-\* models and fixed `reasoning.effort` allowed values) to avoid OpenAI API errors and reduce nondeterministic behavior.

- **Persistence improvements**: action items and blockers are persisted with `externalId` values. When missing, a UUID is generated at create-time and stored in the DB. This `externalId` will be used as the canonical external mapping key (e.g., Notion row id).

- **Bulk create/update + defensive checks**: services for blockers and action items support bulk `createMany` and `updateMany`. Both services now check that the referenced meeting exists before attempting to write artifacts to avoid foreign-key failures.

- **Prisma schema change**: `ExecutionArtifact` received an optional `externalId` field (indexed) to map DB rows to external systems (Notion). Run the migration locally to apply it.

## ✅ How to apply DB changes locally

After pulling the latest code, run the Prisma migration and regenerate the client:

```bash
npx prisma migrate dev --name add-externalId-executionArtifact
npx prisma generate
```

If you don't have an existing `meeting` record when the orchestrator tries to persist artifacts, the services will log and throw an explanatory error. Either ensure a meeting record exists or ask me to add automatic meeting creation.

## 🧭 Using `externalId` for Notion (planned flow)

- On create: the service generates a UUID `externalId` if not provided, stores it in `ExecutionArtifact.externalId`, then the Notion sync service can create a Notion row and update Notion metadata using that `externalId` as the canonical id.
- On update: the Notion sync looks up the artifact by `externalId` and updates the matching Notion row.

## 📷 Architecture diagram

The architecture diagram helps visualize the agentic pipeline (orchestrator → extraction agents → reconciliation → DB → follow-up). Place the architecture image file you received into the repo at `docs/architecture.png` and it will render here in the README.

![Post-Call Execution Intelligence (Agentic Architecture)](docs/architecture.png)

If you want me to place the exact image attachment into the repo, upload or copy the file to `docs/architecture.png` (I can also add it if you provide the image file). The README references `docs/architecture.png` so any viewer will see it on GitHub or locally if the file exists.

## 🔁 Quick dev checklist (after pulling changes)

1. Install deps: `npm install`
2. Apply DB migration: `npx prisma migrate dev --name add-externalId-executionArtifact`
3. Generate Prisma client: `npx prisma generate`
4. Type-check: `npx tsc --noEmit`
5. Run: `npx tsx ./src/index.js`

---

If you'd like, I can also:

- add an automated step that creates a meeting record when missing (queue artifacts until meeting exists), or
- scaffold the Notion sync service that uses `externalId` as the Notion row id and writes back the Notion id into `externalId` on create.

Tell me which of those you'd like next.
