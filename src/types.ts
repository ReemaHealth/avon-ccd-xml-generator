export interface NoteAnswerOption {
  id: string;
  name: string;
  order: number;
  points: number;
  description: string;
}

export interface NoteAnswer {
  id: string;
  name: string | null;
  type: string;
  response: string | null;
  responses: string[] | null;
  date: string | null;
  time: string | null;
  codes: string[] | null;
  options: NoteAnswerOption[] | null;
  patient: string | null;
  note_template_question: string | null;
  [key: string]: unknown;
}

export interface NoteSection {
  id: string;
  object: string;
  name: string;
  answers: NoteAnswer[];
}

export interface Note {
  id: string;
  object: string;
  patient: string;
  name: string;
  created_at: string;
  last_updated_at: string;
  created_by: string;
  account: string;
  sections: NoteSection[];
  [key: string]: unknown;
}

export interface PatientAddress {
  id: string;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface Patient {
  id: string;
  object: string;
  mrn: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  gender: string | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  date_of_birth: string | null;
  addresses: PatientAddress[] | null;
  [key: string]: unknown;
}
