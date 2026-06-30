import type { Agent3Input, Agent3Output } from '@/types/agent';
import { CATEGORY_TO_DEPARTMENT, CONVERGENCE_RADIUS_METRES, SLA_HOURS } from '@/lib/utils/constants';
import { getWardFromGPS } from '@/lib/geo/ward-lookup';
import { haversineDistanceMetres } from '@/lib/geo/haversine';
import type { Department } from '@/types/user';

export interface RoutingCandidate {
  issueId: string;
  gpsLat: number;
  gpsLng: number;
  status: string;
}

export interface Agent3Store {
  findOfficial(ward: string, department: Department, supervisor: boolean): Promise<string | null>;
  findOpenIssuesNear(lat: number, lng: number): Promise<RoutingCandidate[]>;
  updateIssue(issueId: string, patch: Record<string, unknown>): Promise<void>;
}

export async function run(input: Agent3Input, store: Agent3Store): Promise<Agent3Output> {
  try {
    const ward = getWardFromGPS(input.gpsLat, input.gpsLng);
    const department = CATEGORY_TO_DEPARTMENT[input.category];
    const assignedOfficialId = await store.findOfficial(ward, department, input.autoEscalate);

    const nearbyIssueIds = (await store.findOpenIssuesNear(input.gpsLat, input.gpsLng))
      .filter((issue) => issue.issueId !== input.issueId)
      .filter(
        (issue) =>
          haversineDistanceMetres(
            { lat: input.gpsLat, lng: input.gpsLng },
            { lat: issue.gpsLat, lng: issue.gpsLng },
          ) <= CONVERGENCE_RADIUS_METRES,
      )
      .map((issue) => issue.issueId);

    const slaDeadline = new Date(Date.now() + SLA_HOURS[input.category][input.severity] * 60 * 60 * 1000);
    const output: Agent3Output = {
      assignedOfficialId: assignedOfficialId || '',
      department,
      ward,
      slaDeadline: slaDeadline as unknown as Agent3Output['slaDeadline'],
      convergenceAlert: nearbyIssueIds.length >= 2,
      nearbyIssueIds,
    };

    if (!assignedOfficialId) {
      await store.updateIssue(input.issueId, {
        ...output,
        status: 'unassigned_no_official',
        updatedAt: new Date(),
      });
      return output;
    }

    await store.updateIssue(input.issueId, {
      ...output,
      status: 'assigned',
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
