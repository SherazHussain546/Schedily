
'use server';

import { generateNotificationEmail, type NotificationEmailInput } from '@/ai/flows/notification-email-flow';
import { initializeFirebase } from '@/firebase';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Triggers a professional notification.
 * This generates AI content and saves it to the recipient's notification ledger in Firestore.
 */
export async function triggerNotification(params: {
  recipientId: string;
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

    // Initialize Firebase for the write operation
    const { firestore } = initializeFirebase();
    
    // Save the notification to the user's Inbox Ledger
    const notificationRef = collection(firestore, 'users', params.recipientId, 'notifications');
    await addDoc(notificationRef, {
      subject: emailData.subject,
      body: emailData.body,
      type: params.type,
      senderName: params.senderName,
      createdAt: serverTimestamp(),
    });

    // SIMULATION: Log the email to the server console
    console.log('--- SCHEDILY EMAIL DISPATCHED & LOGGED ---');
    console.log(`TO: ${params.recipientEmail} (${params.recipientName}) [ID: ${params.recipientId}]`);
    console.log(`SUBJECT: ${emailData.subject}`);
    console.log(`BODY: ${emailData.body}`);
    console.log('------------------------------------------');

    return { success: true, ...emailData };
  } catch (error) {
    console.error('Notification dispatch failed:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
