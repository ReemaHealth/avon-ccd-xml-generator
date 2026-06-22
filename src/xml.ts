import { Note, NoteAnswer, Patient } from "./types";

const CODE_SYSTEM = {
  LOINC: { oid: "2.16.840.1.113883.6.1", name: "LOINC" },
  SNOMED_CT: { oid: "2.16.840.1.113883.6.96", name: "SNOMED CT" },
  ICD10_CM: { oid: "2.16.840.1.113883.6.90", name: "ICD10CM" },
  HL7_ACT_CLASS: { oid: "2.16.840.1.113883.5.6", name: "HL7ActClass" },
  HL7_ACT_STATUS: { oid: "2.16.840.1.113883.5.14", name: "ActStatus" },
  HL7_ADMIN_GENDER: {
    oid: "2.16.840.1.113883.5.1",
    name: "AdministrativeGender",
  },
  HL7_CONFIDENTIALITY: {
    oid: "2.16.840.1.113883.5.25",
    name: "Confidentiality",
  },
  NUCC: { oid: "2.16.840.1.113883.6.101", name: "NUCC" },
} as const;

const statusCode = (code: string): string =>
  `<statusCode code="${code}" codeSystem="${CODE_SYSTEM.HL7_ACT_STATUS.oid}" codeSystemName="${CODE_SYSTEM.HL7_ACT_STATUS.name}"/>`;

const escapeText = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (value: string): string =>
  escapeText(value).replace(/"/g, "&quot;");

const stripPrefix = (value: string): string => value.replace(/^[^_]+_/, "");

const toCdaDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const findAnswer = (note: Note, name: string): NoteAnswer | undefined => {
  for (const section of note.sections ?? []) {
    for (const answer of section.answers ?? []) {
      if (answer.name === name) return answer;
    }
  }
  return undefined;
};

const selectedOptionName = (answer: NoteAnswer | undefined): string | null => {
  if (!answer || !answer.options || !answer.response) return null;
  const opt = answer.options.find((o) => o.id === answer.response);
  return opt ? opt.name : null;
};

const genderToCda = (
  gender: string | null | undefined,
): { code: string; display: string } => {
  switch ((gender ?? "").toLowerCase()) {
    case "female":
    case "f":
      return { code: "F", display: "Female" };
    case "male":
    case "m":
      return { code: "M", display: "Male" };
    default:
      return { code: "UN", display: "Undifferentiated" };
  }
};

const visitTypeToSnomedDisplay = (visitType: string | null): string => {
  switch ((visitType ?? "").toLowerCase()) {
    case "phone":
      return "Telephone consultation";
    case "in person":
      return "In-person encounter";
    default:
      return visitType ?? "Encounter";
  }
};

export function buildCcdXml(note: Note, patient: Patient): string {
  const noteIdExt = stripPrefix(note.id);
  const createdDate = toCdaDate(note.created_at) ?? "";
  const birthDate = toCdaDate(patient.date_of_birth) ?? "";

  const gender = genderToCda(patient.gender ?? patient.sex);
  const mrn = patient.mrn ?? stripPrefix(patient.id);
  const phone = patient.phone ? patient.phone.replace(/[^\d+]/g, "") : "";
  const givenName = patient.first_name ?? "";
  const familyName = patient.last_name ?? "";

  const guideFirst = (
    findAnswer(note, "Guide First Name")?.response ?? ""
  ).trim();
  const guideLast = (
    findAnswer(note, "Guide Last Name")?.response ?? ""
  ).trim();

  const visitType = selectedOptionName(findAnswer(note, "Visit Type"));
  const snomedCode = selectedOptionName(findAnswer(note, "SNOMED code"));
  const patientId = findAnswer(note, "Patient ID")?.response;
  const visitDisplay = visitTypeToSnomedDisplay(visitType);

  const followupDate =
    toCdaDate(findAnswer(note, "Followup Date")?.date ?? null) ?? createdDate;

  const diagnosisAnswer = findAnswer(note, "Diagnosis Addressed");
  const icdCodes = diagnosisAnswer?.codes ?? [];
  const diagnosisDescription = (
    findAnswer(note, "Diagnosis Description")?.response ?? ""
  ).trim();
  const hasProblems = icdCodes.length > 0 || diagnosisDescription.length > 0;

  return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:voc="urn:hl7-org:v3/voc" xmlns:sdtc="urn:hl7-org:sdtc">
  <realmCode code="US"/>
  <typeId extension="POCD_HD000040" root="2.16.840.1.113883.1.3"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1" extension="2015-08-01"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.2" extension="2015-08-01"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.2"/>
  <id extension="${escapeAttr(noteIdExt)}" root="2.16.840.1.113883.19.5.99999.1"/>
  <code code="34133-9" displayName="Summarization of Episode Note" codeSystem="${CODE_SYSTEM.LOINC.oid}" codeSystemName="${CODE_SYSTEM.LOINC.name}"/>
  <title>CCD for consultation ${escapeText(noteIdExt)}</title>
  <effectiveTime value="${escapeAttr(createdDate)}"/>
  <confidentialityCode code="N" displayName="normal" codeSystem="${CODE_SYSTEM.HL7_CONFIDENTIALITY.oid}" codeSystemName="${CODE_SYSTEM.HL7_CONFIDENTIALITY.name}"/>
  <languageCode code="en-US"/>
  <setId extension="${escapeAttr(noteIdExt)}" root="2.16.840.1.113883.19.5.99999.19"/>
  <versionNumber value="1"/>
  <recordTarget>
    <patientRole>
      <id extension="${escapeAttr(patientId ?? mrn)}" root="2.16.840.1.113883.4.1"/>
${phone ? `      <telecom value="tel:${escapeAttr(phone)}" use="MC"/>\n` : ""}      <patient>
        <name use="L">
          <given>${escapeText(givenName)}</given>
          <family>${escapeText(familyName)}</family>
        </name>
        <administrativeGenderCode code="${gender.code}" displayName="${gender.display}" codeSystem="${CODE_SYSTEM.HL7_ADMIN_GENDER.oid}" codeSystemName="${CODE_SYSTEM.HL7_ADMIN_GENDER.name}"/>
        <birthTime value="${escapeAttr(birthDate)}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <dataEnterer>
    <assignedEntity>
      <id root="2.16.840.1.113883.4.6"/>
      <assignedPerson>
        <name>
          <given>${escapeText(guideFirst)}</given>
          <family>${escapeText(guideLast)}</family>
        </name>
      </assignedPerson>
    </assignedEntity>
  </dataEnterer>
  <documentationOf>
    <serviceEvent classCode="PCPR">
      <effectiveTime>
        <low value="${escapeAttr(createdDate)}"/>
        <high value="${escapeAttr(createdDate)}"/>
      </effectiveTime>
      <performer typeCode="PRF">
        <assignedEntity>
          <id root="2.16.840.1.113883.4.6"/>
          <code code="${escapeAttr(snomedCode ?? "")}" codeSystem="${CODE_SYSTEM.SNOMED_CT.oid}" codeSystemName="${CODE_SYSTEM.SNOMED_CT.name}" displayName="Community Guide"/>
        </assignedEntity>
      </performer>
    </serviceEvent>
  </documentationOf>
  <component>
    <structuredBody>
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.22.1" extension="2015-08-01"/>
          <code code="46240-8" codeSystem="${CODE_SYSTEM.LOINC.oid}" codeSystemName="${CODE_SYSTEM.LOINC.name}" displayName="History of encounters"/>
          <title>ENCOUNTERS</title>
          <text>
            <paragraph>
              <content ID="Encounter1">${escapeText(visitDisplay)}</content>
            </paragraph>
          </text>
          <entry typeCode="DRIV">
            <encounter classCode="ENC" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.49" extension="2015-08-01"/>
              <templateId root="2.16.840.1.113883.10.20.22.4.49"/>
              <id root="${escapeAttr(noteIdExt)}"/>
              <code code="${escapeAttr(snomedCode ?? "")}" codeSystem="${CODE_SYSTEM.SNOMED_CT.oid}" codeSystemName="${CODE_SYSTEM.SNOMED_CT.name}" displayName="${escapeAttr(visitDisplay)}">
                <originalText>
                  <reference value="#Encounter1"/>
                </originalText>
              </code>
              <statusCode code="completed"/>
              <effectiveTime value="${escapeAttr(followupDate)}"/>
              <performer>
                <assignedEntity>
                  <id root="2.16.840.1.113883.4.6"/>
                  <code code="172V00000X" codeSystem="${CODE_SYSTEM.NUCC.oid}" codeSystemName="${CODE_SYSTEM.NUCC.name}" displayName="Community Guide"/>
                </assignedEntity>
              </performer>
              <participant typeCode="PART">
                <participantRole classCode="ASSIGNED">
                  <id root="2.16.840.1.113883.4.6"/>
                  <code code="${escapeAttr(snomedCode ?? "")}" codeSystem="${CODE_SYSTEM.SNOMED_CT.oid}" codeSystemName="${CODE_SYSTEM.SNOMED_CT.name}" displayName="${escapeAttr(visitDisplay)}"/>
                </participantRole>
              </participant>
            </encounter>
          </entry>
        </section>
      </component>
${hasProblems ? buildProblemsSection(icdCodes, diagnosisDescription, createdDate) : ""}    </structuredBody>
  </component>
</ClinicalDocument>
`;
}

function buildProblemValue(code: string | null, refId: string): string {
  if (code) {
    return `<value xsi:type="CD" code="${escapeAttr(code)}" codeSystem="${CODE_SYSTEM.ICD10_CM.oid}" codeSystemName="${CODE_SYSTEM.ICD10_CM.name}">
                    <originalText>
                      <reference value="#${escapeAttr(refId)}"/>
                    </originalText>
                  </value>`;
  }

  return `<value xsi:type="CD" nullFlavor="OTH">
                    <originalText>
                      <reference value="#${escapeAttr(refId)}"/>
                    </originalText>
                  </value>`;
}

function buildProblemsSection(
  icdCodes: string[],
  description: string,
  effectiveDate: string,
): string {
  const items =
    icdCodes.length > 0
      ? icdCodes.map((code, index) => ({
          code,
          refId: `Problem${index + 1}`,
        }))
      : [{ code: null as string | null, refId: "Problem1" }];

  const narrative = items
    .map(({ code, refId }) =>
      code
        ? `            <paragraph>${escapeText(code)}: <content ID="${escapeAttr(refId)}">${escapeText(description)}</content></paragraph>`
        : `            <paragraph><content ID="${escapeAttr(refId)}">${escapeText(description)}</content></paragraph>`,
    )
    .join("\n");

  const entries = items
    .map(
      ({ code, refId }) => `          <entry typeCode="DRIV">
            <act classCode="ACT" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.3" extension="2015-08-01"/>
              <code code="CONC" codeSystem="${CODE_SYSTEM.HL7_ACT_CLASS.oid}" codeSystemName="${CODE_SYSTEM.HL7_ACT_CLASS.name}"/>
              ${statusCode("active")}
              <effectiveTime>
                <low value="${escapeAttr(effectiveDate)}"/>
              </effectiveTime>
              <entryRelationship typeCode="SUBJ">
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.4" extension="2015-08-01"/>
                  <code code="55607006" codeSystem="${CODE_SYSTEM.SNOMED_CT.oid}" codeSystemName="${CODE_SYSTEM.SNOMED_CT.name}" displayName="Problem"/>
                  ${statusCode("completed")}
                  <effectiveTime>
                    <low value="${escapeAttr(effectiveDate)}"/>
                  </effectiveTime>
                  ${buildProblemValue(code, refId)}
                </observation>
              </entryRelationship>
            </act>
          </entry>`,
    )
    .join("\n");

  return `      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.5.1" extension="2015-08-01"/>
          <code code="11450-4" codeSystem="${CODE_SYSTEM.LOINC.oid}" codeSystemName="${CODE_SYSTEM.LOINC.name}" displayName="Problem List"/>
          <title>PROBLEMS</title>
          <text>
${narrative}
          </text>
${entries}
        </section>
      </component>
`;
}
