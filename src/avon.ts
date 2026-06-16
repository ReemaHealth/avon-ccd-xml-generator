import axios, { AxiosInstance } from "axios";
import { Note, Patient } from "./types";

export interface AvonConfig {
  baseSubdomain: string;
  clientId: string;
  clientSecret: string;
  userId: string;
  accountId?: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type?: string;
}

interface JwtResponse {
  jwt: string;
}

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export class AvonClient {
  private readonly http: AxiosInstance;
  private readonly config: AvonConfig;

  private token: string | null = null;
  private tokenExpiresAt = 0;
  private jwt: string | null = null;

  constructor(config: AvonConfig) {
    this.config = config;
    this.http = axios.create({
      baseURL: `https://${config.baseSubdomain}.avonhealth.com/v2`,
      timeout: 30_000,
    });
  }

  async getNote(noteId: string): Promise<Note> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<Note>(`/notes/${noteId}`, { headers });
    return data;
  }

  async getPatient(patientId: string): Promise<Patient> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<Patient>(`/patients/${patientId}`, { headers });
    return data;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const jwt = await this.getJwt(token);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "x-jwt": jwt,
    };
    if (this.config.accountId) {
      headers["account"] = this.config.accountId;
    }
    return headers;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return this.token;
    }
    const { data } = await this.http.post<TokenResponse>("/auth/token", {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    this.jwt = null;
    return this.token;
  }

  private async getJwt(token: string): Promise<string> {
    if (this.jwt) return this.jwt;
    const { data } = await this.http.post<JwtResponse>(
      "/auth/get-jwt",
      { id: this.config.userId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    this.jwt = data.jwt;
    return this.jwt;
  }
}
