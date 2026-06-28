import type { Agenda } from 'agenda';
import {
  processSummaryJob,
  SUMMARY_JOB_NAME,
  type UpdateConversationSummaryJobData,
} from '@/services/conversation-summary.service.js';

export function registerConversationSummaryJob(agenda: Agenda): void {
  agenda.define<UpdateConversationSummaryJobData>(SUMMARY_JOB_NAME, async (job) => {
    await processSummaryJob(job.attrs.data);
  });
}
