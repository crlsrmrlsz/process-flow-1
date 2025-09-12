import { EventLogEvent } from '@/types';

// Small, realistic permit process event log (2–3 cases), suitable for demos and Git repos.
// Activities include: Submit Application, Intake Review, Payment (Due/Received/Underpaid/Late/Corrected),
// Docs (Check, Request More Docs, Re-Upload, Resubmission Review), Assignment, Reviews, Escalation, Decisions.

const base = new Date('2025-02-01T09:00:00Z').getTime();
const t = (mins: number) => new Date(base + mins * 60_000).toISOString();

export const sampleEvents: EventLogEvent[] = [
  // Case P1 — Online, straightforward but slow reviewer
  { caseId: 'P1', activity: 'Submit Application', timestamp: t(0), resource: 'u-intake-1' },
  { caseId: 'P1', activity: 'Intake Review', timestamp: t(15), resource: 'u-intake-2' },
  { caseId: 'P1', activity: 'Payment Due', timestamp: t(25), resource: 'u-fin-1' },
  { caseId: 'P1', activity: 'Payment Received', timestamp: t(40), resource: 'u-fin-1' },
  { caseId: 'P1', activity: 'Assign To Staff', timestamp: t(50), resource: 'u-proc-1' },
  { caseId: 'P1', activity: 'Initial Review', timestamp: t(60), resource: 'u-proc-slow' },
  { caseId: 'P1', activity: 'Approved', timestamp: t(60 + 2400), resource: 'u-proc-slow' }, // slow reviewer (+40h)

  // Case P2 — In-person intake, docs re-requested twice, underpaid then corrected, rework loop then rejected
  { caseId: 'P2', activity: 'Submit Application', timestamp: t(5), resource: 'u-desk-1' },
  { caseId: 'P2', activity: 'Intake Review', timestamp: t(20), resource: 'u-intake-3' },
  { caseId: 'P2', activity: 'Docs Check', timestamp: t(28), resource: 'u-intake-3' },
  { caseId: 'P2', activity: 'Request More Docs', timestamp: t(35), resource: 'u-intake-3' },
  { caseId: 'P2', activity: 'Re-Upload Docs', timestamp: t(60), resource: 'applicant' },
  { caseId: 'P2', activity: 'Resubmission Review', timestamp: t(80), resource: 'u-intake-3' },
  { caseId: 'P2', activity: 'Request More Docs', timestamp: t(95), resource: 'u-intake-3' },
  { caseId: 'P2', activity: 'Re-Upload Docs', timestamp: t(140), resource: 'applicant' },
  { caseId: 'P2', activity: 'Payment Due', timestamp: t(160), resource: 'u-fin-2' },
  { caseId: 'P2', activity: 'Payment Underpaid', timestamp: t(170), resource: 'u-fin-2' },
  { caseId: 'P2', activity: 'Payment Corrected', timestamp: t(200), resource: 'u-fin-2' },
  { caseId: 'P2', activity: 'Assign To Staff', timestamp: t(210), resource: 'u-proc-2' },
  { caseId: 'P2', activity: 'Initial Review', timestamp: t(220), resource: 'u-proc-2' },
  { caseId: 'P2', activity: 'Rework', timestamp: t(280), resource: 'u-proc-2' },
  { caseId: 'P2', activity: 'Second Review', timestamp: t(340), resource: 'u-proc-2' },
  { caseId: 'P2', activity: 'Rejected', timestamp: t(360), resource: 'u-proc-2' },

  // Case P3 — Late payment and escalation to Legal, then approved
  { caseId: 'P3', activity: 'Submit Application', timestamp: t(12), resource: 'u-intake-1' },
  { caseId: 'P3', activity: 'Intake Review', timestamp: t(25), resource: 'u-intake-2' },
  { caseId: 'P3', activity: 'Payment Due', timestamp: t(35), resource: 'u-fin-1' },
  { caseId: 'P3', activity: 'Payment Late', timestamp: t(200), resource: 'u-fin-1' },
  { caseId: 'P3', activity: 'Payment Received', timestamp: t(210), resource: 'u-fin-1' },
  { caseId: 'P3', activity: 'Assign To Staff', timestamp: t(220), resource: 'u-proc-3' },
  { caseId: 'P3', activity: 'Initial Review', timestamp: t(230), resource: 'u-proc-3' },
  { caseId: 'P3', activity: 'Escalate to Legal', timestamp: t(290), resource: 'u-proc-3' },
  { caseId: 'P3', activity: 'Appeal Review', timestamp: t(330), resource: 'u-legal-1' },
  { caseId: 'P3', activity: 'Approved', timestamp: t(360), resource: 'u-legal-1' },
];
