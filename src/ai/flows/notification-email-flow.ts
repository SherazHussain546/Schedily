'use server';
/**
 * @fileOverview A professional notification email generation flow.
 *
 * - generateNotificationEmail - Uses Genkit to write professional email subjects and bodies.
 * - NotificationEmailInput - The input type for the notification generation.
 * - NotificationEmailOutput - The return type containing subject and body.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NotificationEmailInputSchema = z.object({
  senderName: z.string().describe('Name of the person who triggered the notification.'),
  recipientName: z.string().describe('Name of the person receiving the email.'),
  type: z.enum(['message', 'shift', 'meeting', 'invitation']).describe('The type of action performed.'),
  groupName: z.string().optional().describe('The name of the professional group, if applicable.'),
  content: z.string().optional().describe('A preview or note associated with the action.'),
});
export type NotificationEmailInput = z.infer<typeof NotificationEmailInputSchema>;

const NotificationEmailOutputSchema = z.object({
  subject: z.string().describe('The email subject line.'),
  body: z.string().describe('The professional email body content.'),
});
export type NotificationEmailOutput = z.infer<typeof NotificationEmailOutputSchema>;

const notificationPrompt = ai.definePrompt({
  name: 'notificationEmailPrompt',
  input: { schema: NotificationEmailInputSchema },
  output: { schema: NotificationEmailOutputSchema },
  prompt: `
    You are the official notification agent for Schedily - Professional Social Coordination.
    
    Generate a professional, concise, and friendly email notification for a user.
    
    Context:
    - Sender: {{senderName}}
    - Recipient: {{recipientName}}
    - Action Type: {{type}}
    {{#if groupName}}- Associated Group: {{groupName}}{{/if}}
    {{#if content}}- Preview/Note: {{content}}{{/if}}
    
    Requirements:
    1. Create a subject line that is clear and captures the importance (e.g., "{{senderName}} sent you a new shift on Schedily").
    2. The body should be 2-3 short, professional sentences explaining what happened.
    3. Include a professional sign-off from "The Schedily Team".
    4. Ensure the recipient feels valued and informed.
  `,
});

export async function generateNotificationEmail(input: NotificationEmailInput): Promise<NotificationEmailOutput> {
  const { output } = await notificationPrompt(input);
  if (!output) throw new Error('Failed to generate notification email content.');
  return output;
}
