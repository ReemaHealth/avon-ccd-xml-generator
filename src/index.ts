import "dotenv/config";
import express, { Request, Response } from "express";
import axios from "axios";
import { AvonClient } from "./avon";
import { buildCcdXml } from "./xml";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const avon = new AvonClient({
  baseSubdomain: requireEnv("AVON_BASE_SUBDOMAIN"),
  clientId: requireEnv("AVON_CLIENT_ID"),
  clientSecret: requireEnv("AVON_CLIENT_SECRET"),
  userId: requireEnv("AVON_USER_ID"),
  accountId: process.env.AVON_ACCOUNT_ID || undefined,
});

const app = express();

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.get("/notes/:noteId/xml", async (req: Request, res: Response) => {
  const noteId = String(req.params.noteId);
  try {
    const note = await avon.getNote(noteId);
    if (!note.patient) {
      res.status(422).json({ error: "Note has no associated patient" });
      return;
    }
    const patient = await avon.getPatient(note.patient);
    const xml = buildCcdXml(note, patient);
    res.type("application/xml").send(xml);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 502;
      res.status(status).json({
        error: "Avon API request failed",
        status,
        detail: err.response?.data ?? err.message,
      });
      return;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`ccd-xml listening on http://localhost:${port}`);
  console.log(`Try: GET /notes/note_xxx/xml`);
});
