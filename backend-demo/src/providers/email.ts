import nodemailer from 'nodemailer'
import { cfg, has } from '../config.js'
import { serviceUnavailable } from '../lib/errors.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!has.smtp) throw serviceUnavailable('EMAIL_UNAVAILABLE', 'SMTP not configured')
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: false,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
    })
  }
  return transporter
}

export async function sendEmail(opts: { to: string; subject: string; text?: string; html?: string }) {
  if (!opts.to) return
  const t = getTransporter()
  await t.sendMail({
    from: cfg.smtp.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  })
}
