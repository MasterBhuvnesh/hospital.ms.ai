import 'dotenv/config'

const bool = (v: string | undefined, d = false) =>
  v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())

export const cfg = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? '',
  demoExposeOtp: bool(process.env.DEMO_EXPOSE_OTP, true),
  autoSeed: bool(process.env.AUTO_SEED, true),

  databaseUrl: process.env.DATABASE_URL ?? '',

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASSWORD ?? '',
    from: process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? '',
  },

  s3: {
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.S3_BUCKET ?? 'hms',
    endpoint: process.env.S3_ENDPOINT ?? '',
    publicUrl: (process.env.S3_PUBLIC_URL ?? '').replace(/\/$/, ''),
  },

  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b',
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'nvidia/nemotron-3-embed-1b',
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 0),
    temperature: Number(process.env.LLM_TEMPERATURE ?? 1),
    topP: Number(process.env.LLM_TOP_P ?? 0.95),
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 2048),
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    smsFrom: process.env.TWILIO_SMS_FROM ?? '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
  },
}

export const has = {
  smtp: Boolean(cfg.smtp.host && cfg.smtp.user && cfg.smtp.pass),
  s3: Boolean(cfg.s3.accessKeyId && cfg.s3.secretAccessKey && cfg.s3.bucket),
  llm: Boolean(cfg.llm.apiKey),
  pg: Boolean(cfg.databaseUrl),
  twilioSms: Boolean(cfg.twilio.accountSid && cfg.twilio.authToken && cfg.twilio.smsFrom),
  twilioWhatsapp: Boolean(cfg.twilio.accountSid && cfg.twilio.authToken && cfg.twilio.whatsappFrom),
}
