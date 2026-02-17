'use server';

import { generateNotificationEmail, type NotificationEmailInput } from '@/ai/flows/notification-email-flow';

/**
 * Triggers a professional notification.
 * In a production environment, this would integrate with an email provider like Resend or SendGrid.
 * For this prototype, it generates AI content and logs the "sent" email.
 */
export async function triggerNotification(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  type: 'message' | 'shift' | 'meeting' | 'invitation';
  groupName?: string;
  content?: string;
}) {
  try {
    const emailData = await generateNotificationEmail({
      senderName: params.senderName,
      recipientName: params.recipientName,
      type: params.type,
      groupName: params.groupName,
      content: params.content,
    });

    // SIMULATION: Log the email to the server console
    console.log('--- SCHEDILY EMAIL DISPATCHED ---');
    console.log(`TO: ${params.recipientEmail} (${params.recipientName})`);
    console.log(`SUBJECT: ${emailData.subject}`);
    console.log(`BODY: ${emailData.body}`);
    console.log('---------------------------------');

    return { success: true, ...emailData };
  } catch (error) {
    console.error('Notification dispatch failed:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
