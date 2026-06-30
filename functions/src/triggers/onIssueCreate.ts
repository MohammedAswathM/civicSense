import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { firestore } from '../admin';
import { agent1Store, agent2Store, agent3Store } from '../agentStores';
import { run as runAgent1 } from '../../../src/lib/agents/agent1-classify';
import { run as runAgent2 } from '../../../src/lib/agents/agent2-dedupe';
import { run as runAgent3 } from '../../../src/lib/agents/agent3-route';
import type { Agent1Input } from '../../../src/types/agent';

export const onIssueCreate = onDocumentCreated('issues/{issueId}', async (event) => {
  const issueId = event.params.issueId;
  const issueData = event.data?.data();
  if (!issueData || issueData.status !== 'pending_classification') return;

  try {
    const agent1Input: Agent1Input = {
      issueId,
      photoUrl: firstString(issueData.photoUrls) || stringField(issueData.photoUrl),
      textDescription: stringField(issueData.textDescription),
      gpsLat: numberField(issueData.gpsLat),
      gpsLng: numberField(issueData.gpsLng),
      gpsAccuracy: numberField(issueData.gpsAccuracy),
    };
    const agent1Result = await runAgent1(agent1Input, agent1Store);
    if (!agent1Result.isValidIssue) return;

    const agent2Result = await runAgent2(
      {
        issueId,
        gpsLat: agent1Input.gpsLat,
        gpsLng: agent1Input.gpsLng,
        category: agent1Result.category,
        severity: agent1Result.severity,
        hasPhoto: Boolean(agent1Input.photoUrl),
      },
      agent2Store,
    );
    if (!agent2Result.isNewIssue) return;

    await runAgent3(
      {
        issueId,
        category: agent1Result.category,
        severity: agent1Result.severity,
        gpsLat: agent1Input.gpsLat,
        gpsLng: agent1Input.gpsLng,
        autoEscalate: agent2Result.autoEscalate,
      },
      agent3Store,
    );
  } catch (error) {
    await firestore.doc(`issues/${issueId}`).update({
      status: 'error_processing',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    });
  }
});

function numberField(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstString(value: unknown): string {
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '';
}
