let temporaryAuthFlowInProgress = false;
let temporaryAuthFlowPromise = null;
let resolveTemporaryAuthFlow = null;
let temporaryPostSignOutRoute = null;

export function beginTemporaryAuthFlow() {
  // If a flow is already active, keep using the same guard.
  if (temporaryAuthFlowInProgress) {
    return;
  }

  temporaryAuthFlowInProgress = true;

  temporaryAuthFlowPromise = new Promise((resolve) => {
    resolveTemporaryAuthFlow = resolve;
  });
}

export function markTemporaryAuthPostSignOutRoute(
  routeName = "Login"
) {
  temporaryPostSignOutRoute = routeName;
}

export function isTemporaryAuthFlowInProgress() {
  return temporaryAuthFlowInProgress;
}

export async function waitForTemporaryAuthFlowToFinish() {
  if (
    !temporaryAuthFlowInProgress ||
    !temporaryAuthFlowPromise
  ) {
    return;
  }

  await temporaryAuthFlowPromise;
}

export function endTemporaryAuthFlow() {
  temporaryAuthFlowInProgress = false;

  if (resolveTemporaryAuthFlow) {
    resolveTemporaryAuthFlow();
  }

  resolveTemporaryAuthFlow = null;
  temporaryAuthFlowPromise = null;
}

export function consumeTemporaryAuthPostSignOutRoute() {
  const route = temporaryPostSignOutRoute;
  temporaryPostSignOutRoute = null;
  return route;
}
