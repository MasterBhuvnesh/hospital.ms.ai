/**
 * The redaction paths that keep PHI and credentials out of the log stream.
 *
 * Architecture section 7.10 makes this the enforcement mechanism rather than
 * developer discipline: "No patient names, emails, phone numbers, or tokens in
 * logs, enforced by pino `redact` paths in `packages/logger`."
 *
 * Two rules for changing this file:
 *
 *   1. Adding a path is always safe. Removing one needs a reason in the commit
 *      message, because every removal is a potential disclosure.
 *   2. A new field carrying patient data is added HERE in the same commit that
 *      introduces it, not afterwards.
 */

/**
 * Field names that must never reach the log stream, wherever they appear.
 *
 * Two entries per name: the top-level path and a single-level wildcard. That
 * covers `{ email }` and `{ user: { email } }`, which is where these fields
 * actually live in practice.
 */
const SENSITIVE_FIELDS = [
  // Direct identifiers. DPDP treats these as personal data on their own.
  'name',
  'fullName',
  'firstName',
  'lastName',
  'patientName',
  'doctorName',
  'email',
  'phone',
  'phoneNumber',
  'mobile',
  'address',
  'dob',
  'dateOfBirth',
  'age',
  'gender',
  'aadhaar',
  'abhaId',
  'insuranceNumber',
  'emergencyContact',

  // Clinical content. The reason this system needs a redaction list at all.
  'diagnosis',
  'symptoms',
  'complaint',
  'chiefComplaint',
  'notes',
  'clinicalNotes',
  'allergies',
  'conditions',
  'medications',
  'prescription',
  'labResult',
  'vitals',
  'reason',

  // Credentials and anything that grants access. Not PHI, but a disclosure.
  'password',
  'passwordHash',
  'hash',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'otp',
  'otpHash',
  'code',
  'secret',
  'apiKey',
  'privateKey',
  'idempotencyKey',
  'signature',
] as const;

/**
 * Request and response shapes, where credentials arrive in a predictable place
 * and a serializer would otherwise log them verbatim.
 */
const REQUEST_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["idempotency-key"]',
  'req.body',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  'body',
  'query.phone',
  'query.email',
  'params.phone',
] as const;

/**
 * `req.body` is redacted wholesale rather than field by field. A request body on
 * this system is a registration, a consultation note, or a prescription, so the
 * safe default is to log nothing of it and let a handler log the specific
 * non-PHI field it actually needs.
 */
export const REDACT_PATHS: string[] = [
  ...REQUEST_PATHS,
  ...SENSITIVE_FIELDS.flatMap((field) => [field, `*.${field}`]),
];

export const REDACT_CENSOR = '[redacted]';
