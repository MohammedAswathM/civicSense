import type { Agent1Input, Agent1Output } from '@/types/agent';
import { GPS_ACCURACY_REJECT_METRES } from '@/lib/utils/constants';
import { classifyIssuePhoto } from '@/lib/gemini/classify';

export interface Agent1Store {
  readPhotoBase64(photoUrl: string): Promise<{ data: string; mimeType: string }>;
  updateIssue(issueId: string, patch: Record<string, unknown>): Promise<void>;
}

export async function run(input: Agent1Input, store: Agent1Store): Promise<Agent1Output> {
  if (input.gpsAccuracy > GPS_ACCURACY_REJECT_METRES) {
    const output: Agent1Output = {
      category: 'other',
      severity: 1,
      confidence: 1,
      geminiDescription: 'Location accuracy is too low to verify this report.',
      isValidIssue: false,
      rejectionReason: 'GPS accuracy is too low. Please resubmit outdoors or use manual pin drop.',
    };
    await store.updateIssue(input.issueId, terminalPatch('rejected', output.rejectionReason, output));
    return output;
  }

  try {
    const photo = await store.readPhotoBase64(input.photoUrl);
    const output = await classifyIssuePhoto({
      photoBase64: photo.data,
      mimeType: photo.mimeType,
      seed: `${input.photoUrl}:${input.textDescription}`,
    });

    if (!output.isValidIssue) {
      await store.updateIssue(
        input.issueId,
        terminalPatch('rejected', output.rejectionReason || 'Invalid civic issue photo.', output),
      );
      return output;
    }

    await store.updateIssue(input.issueId, {
      ...output,
      status: 'pending_deduplication',
      updatedAt: new Date(),
    });
    return output;
  } catch (error) {
    await store.updateIssue(input.issueId, {
      status: 'error_processing',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    });
    throw error;
  }
}

function terminalPatch(status: 'rejected' | 'error_processing', note: string | undefined, output: Agent1Output) {
  return {
    ...output,
    status,
    rejectionReason: note,
    updatedAt: new Date(),
  };
}
