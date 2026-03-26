import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

export function getMailTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  // Amazon SES via SMTP, or any SMTP provider
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.eu-central-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  })

  return transporter
}

export function getFromAddress(): string {
  return process.env.MAIL_FROM || 'noreply@adminyzr.io'
}
