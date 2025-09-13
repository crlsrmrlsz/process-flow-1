const MAP: Record<string, string> = {
  START: 'START',
  APP_SUBMIT: 'Application Submission',
  INITIAL_REVIEW: 'Initial Review',
  REQ_CHECK: 'Requirements Check',
  HEALTH_INSPECTION: 'Health Inspection',
  INFO_REQUEST: 'Information Request',
  APPLICANT_RESPONSE: 'Applicant Response',
  MANAGER_APPROVAL: 'Manager Approval',
  PERMIT_REGISTERED: 'Permit Registered',
  PLACARD_ISSUED: 'Placard Issued (QR)',
  APPROVED: 'Approved',
  LABEL_READY_DIGITAL: 'Label Ready (Digital)',
  LABEL_DISPATCH_POSTAL: 'Label Dispatched (Postal)',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  APPEAL_PROCESS: 'Appeal Process',
};

export function friendlyName(id: string): string {
  if (MAP[id]) return MAP[id];
  const spaced = id.replace(/_/g, ' ');
  const lower = spaced.toLowerCase();
  return lower.replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function truncateLabel(text: string, max = 24): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return text.slice(0, max - 1) + '…';
}
