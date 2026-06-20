export function applyPlayerSurfaceRecorded(run, view) {
  ensurePlayerSurface(run);
  run.worldState.playerSurface.currentView = structuredClone(view);
  run.worldState.playerSurface.viewHistory.push(structuredClone(view));
  run.worldState.playerSurface.viewHistory = run.worldState.playerSurface.viewHistory.slice(-24);
}

export function applyPlayerSurfaceRejected(run, rejection) {
  ensurePlayerSurface(run);
  run.worldState.playerSurface.rejections.push(structuredClone(rejection));
  run.worldState.playerSurface.rejections = run.worldState.playerSurface.rejections.slice(-24);
}

export function ensurePlayerSurface(run) {
  run.worldState ??= {};
  run.worldState.playerSurface ??= {};
  run.worldState.playerSurface.viewHistory ??= [];
  run.worldState.playerSurface.rejections ??= [];
  return run.worldState.playerSurface;
}
