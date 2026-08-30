# AI Conversation Replay Demo

A Vue 3 dashboard for reviewing call recordings faster. Upload a call recording, run it through the configured transcription service, and review the generated summary, AI-selected replay moments, and transcript evidence alongside the audio waveform.

## Features

- Upload WAV, MP3, M4A, AAC, FLAC, or OGG call recordings
- Generate a call summary, replay events, and transcript through a configurable analysis endpoint
- Play, pause, seek, and change playback speed from a WaveSurfer waveform
- Click an AI replay event to seek to its start and automatically play only its range
- Highlight selected replay evidence and the current transcript segment
- Click transcript segments to seek the audio without constraining normal playback
- Validate service responses and show actionable errors or data warnings

## Requirements

- Node.js 20 or later (Node.js 18.18+ should also work)
- npm
- An audio-analysis endpoint compatible with the response described below

## Setup

```bash
npm install
Copy-Item .env.example .env
```

Set `VITE_TRANSCRIPTION_URL` in `.env` to the endpoint that accepts the uploaded audio file:

```env
VITE_TRANSCRIPTION_URL=http://your-analysis-service:4000/transcribe
```

Start the development server:

```bash
npm run dev
```

Vite prints the local URL in the terminal. Choose an audio file and select **Analyze call**.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server, exposed on the local network. |
| `npm run typecheck` | Run Vue and TypeScript type checking. |
| `npm run test` | Run the Vitest test suite. |
| `npm run build` | Type-check and create a production build in `dist/`. |

## Analysis endpoint contract

The app posts the selected file as `multipart/form-data` with a `file` field to `VITE_TRANSCRIPTION_URL`.

On success, it expects a JSON payload with `status: "success"`, source transcription segments (`Segments` and optional `SegmentsAndWords`, serialized as JSON strings), and a `jamai_response` completion containing a JSON string in `SummarizeConversationReplay`. The completion must include:

```ts
{
  callId: string;
  callSummary: {
    reasonForCall: string | null;
    resolution: string | null;
    outcome: string | null;
    customerSentiment: "positive" | "neutral" | "negative" | "mixed" | "unknown";
    caseStatus: string;
  };
  replayEvents: Array<{
    eventId: string;
    eventType: string;
    startSec: number;
    endSec: number;
    title: string;
    summary: string;
    speaker: "AGENT" | "CUSTOMER" | "BOTH" | "UNKNOWN";
    importance: "high" | "medium" | "low";
    confidence: number;
    sourceSegmentIds: number[];
  }>;
}
```

The UI uses the local browser object URL for audio playback. It does not persist uploaded audio or call data.

## Replay behavior

Selecting an event starts playback at its timestamp (with a small optional pre-roll) and pauses at the event end (with a small optional post-roll). Manual seeking cancels range-limited replay mode, so normal playback continues naturally.

## Project structure

```text
src/
├── components/       # Upload, audio, summary, timeline, and transcript UI
├── services/         # Analysis endpoint client and response validation
├── types/            # Shared TypeScript data model
└── utils/            # Playback, time-formatting, and event-style helpers
```

## Troubleshooting

- **Unable to connect to the audio analysis service**: confirm `VITE_TRANSCRIPTION_URL`, that the service is running, and that its CORS policy allows the Vite origin.
- **Invalid backend response**: verify the response follows the contract above and that replay-event timestamps are finite numbers with `endSec > startSec`.
- **Audio does not load**: try a browser-supported format and confirm the local file is not empty.

## License

Private project. All rights reserved.
