export type IntelligenceActivationState = {
  activeRun?: string | null;
  previousActiveRun?: string | null;
  recentActiveRuns?: string[];
};

const keepRecent = (...runs: Array<string | null | undefined>): string[] =>
  [...new Set(runs.filter((run): run is string => typeof run === 'string' && run.length > 0))].slice(0, 3);

export function nextActivationState(
  current: IntelligenceActivationState,
  nextRunId: string,
): Required<Pick<IntelligenceActivationState, 'activeRun' | 'previousActiveRun' | 'recentActiveRuns'>> {
  const currentRun = current.activeRun ?? null;

  return {
    activeRun: nextRunId,
    previousActiveRun: currentRun && currentRun !== nextRunId ? currentRun : (current.previousActiveRun ?? null),
    recentActiveRuns: keepRecent(nextRunId, currentRun, ...(current.recentActiveRuns ?? [])),
  };
}

export function rollbackActivationState(
  current: IntelligenceActivationState,
  failedRunId: string,
): Required<Pick<IntelligenceActivationState, 'activeRun' | 'previousActiveRun' | 'recentActiveRuns'>> {
  if (current.activeRun !== failedRunId) {
    throw new Error(`Cannot roll back ${failedRunId}: it is not the active run.`);
  }

  const previousRun = current.previousActiveRun;

  if (!previousRun || previousRun === failedRunId) {
    throw new Error('Cannot roll back: no previous active run is recorded.');
  }

  return {
    activeRun: previousRun,
    previousActiveRun: failedRunId,
    recentActiveRuns: keepRecent(previousRun, failedRunId, ...(current.recentActiveRuns ?? [])),
  };
}