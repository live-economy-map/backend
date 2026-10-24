import logger from '../utils/logger.js';
import { env } from '../config/env.js';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // In development / test, log the email action
  logger.info(
    { to: options.to, subject: options.subject },
    `[Transactional Email] Sending email to ${options.to}: "${options.subject}"`,
  );
  return true;
};

export const sendVerificationEmail = async (email: string, token: string): Promise<boolean> => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Verify your Live Economy Map account',
    text: `Please verify your account by visiting: ${verifyUrl}`,
    html: `<p>Please verify your account by clicking <a href="${verifyUrl}">here</a>.</p>`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<boolean> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Reset your Live Economy Map password',
    text: `Reset your password by visiting: ${resetUrl}`,
    html: `<p>Reset your password by clicking <a href="${resetUrl}">here</a>.</p>`,
  });
};

export const sendRequestStatusChangeEmail = async (
  email: string,
  requestTitle: string,
  newStatus: string,
  note?: string | null,
): Promise<boolean> => {
  const noteContent = note ? ` Notes: "${note}"` : '';
  return sendEmail({
    to: email,
    subject: `Report Request Update: ${requestTitle}`,
    text: `Your custom report request "${requestTitle}" status has been updated to ${newStatus}.${noteContent}`,
    html: `<p>Your custom report request <strong>${requestTitle}</strong> status has been updated to <strong>${newStatus}</strong>.</p>${
      note ? `<p><em>Notes:</em> ${note}</p>` : ''
    }`,
  });
};

export const sendAnomalyAlertEmail = async (
  email: string,
  cellLabel: string,
  delta: number,
  period: string,
): Promise<boolean> => {
  const direction = delta > 0 ? 'increase' : 'decrease';
  const percentage = (Math.abs(delta) * 100).toFixed(1);
  return sendEmail({
    to: email,
    subject: `Live Economy Map Alert: ${percentage}% economic shift in ${cellLabel}`,
    text: `An economic anomaly was detected in ${cellLabel} for period ${period}. Composite activity shifted by ${percentage}% (${direction}).`,
    html: `<p>An economic anomaly was detected in <strong>${cellLabel}</strong> for period <strong>${period}</strong>.</p><p>Composite activity score shifted by <strong>${percentage}%</strong> (${direction}).</p>`,
  });
};
