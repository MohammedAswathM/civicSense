import { MAX_REPORTS_PER_USER_PER_DAY } from './constants';

export function isDailyReportLimitExceeded(reportCount: number): boolean {
  return reportCount >= MAX_REPORTS_PER_USER_PER_DAY;
}
