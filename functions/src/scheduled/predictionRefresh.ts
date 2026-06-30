import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firestore } from '../admin';
import { demoPredictions } from '../../../src/lib/agents/agent5-predict';

export const predictionRefresh = onSchedule('0 2 * * 0', async () => {
  const predictions = demoPredictions();
  await Promise.all(
    predictions.map((prediction) =>
      firestore.doc(`predictions/${prediction.wardId}`).set({
        ...prediction,
        generatedAt: new Date(),
      }),
    ),
  );
});
