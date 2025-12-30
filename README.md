# Post-Call Agent

A TypeScript-based application that automatically captures, processes, and analyzes meeting data from Google Meet to generate transcripts and actionable insights.

## 🎯 Overview

Post-Call Agent is an intelligent meeting intelligence platform that:
- **Captures** live meeting sessions from Google Meet using automated bot agents
- **Processes** raw caption data into structured transcript segments
- **Extracts** actionable artifacts including action items, decisions, and summary points
- **Stores** all processed data in a PostgreSQL database for further analysis

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
- Includes priority, visibility, and confidence levels

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

[Your Name/Organization]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Status**: The application is currently in development. Core data processing from raw caption to structured transcript is functional.
