# ccd-xml

Small Express + TypeScript service that pulls a note and its patient from the
Avon Health API and returns a CCD (Continuity of Care Document) XML.

## Prerequisites

- Node.js 18+
- Avon Health API credentials (client ID, client secret, user ID, and your
  account's base subdomain)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and fill in:

| Variable               | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `PORT`                 | Port the server listens on (default `3000`)          |
| `AVON_BASE_SUBDOMAIN`  | Your Avon subdomain (`https://<subdomain>.avonhealth.com`) |
| `AVON_CLIENT_ID`       | Provided by your Avon Health contact                 |
| `AVON_CLIENT_SECRET`   | Provided by your Avon Health contact                 |
| `AVON_USER_ID`         | The user ID to mint a JWT for (e.g. `user_xxx`)      |
| `AVON_ACCOUNT_ID`      | Sandbox-only `account` header — leave blank in prod  |

## Running

Dev (auto-reload):

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

You should see:

```
ccd-xml listening on http://localhost:3000
```

## Usage

Pass a note ID to the XML endpoint:

```bash
curl http://localhost:3000/notes/note_c66950e5fd084b0b95d50a03ba4a479d/xml
```

The service will:

1. `GET /v2/notes/:id` — fetch the note
2. `GET /v2/patients/:id` — fetch the patient referenced by `note.patient`
3. Render a CCD XML document and return it as `application/xml`

Health check:

```bash
curl http://localhost:3000/healthz
```

## Project layout

```
src/
├── index.ts    Express app and routes
├── avon.ts     Avon API client (token + JWT auth, caches bearer)
├── xml.ts      CCD XML builder
└── types.ts    Note / Patient TypeScript types
```

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Run with `ts-node-dev` (auto-reload)  |
| `npm run build`    | Compile TypeScript to `dist/`         |
| `npm start`        | Run the compiled build                |
| `npm run typecheck`| Type-check without emitting           |
