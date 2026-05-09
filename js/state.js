const States = {
  CAROUSEL: 'CAROUSEL',
  PAGE_OPEN: 'PAGE_OPEN',
  TRANSITIONING: 'TRANSITIONING'
};

const transitions = {
  [States.CAROUSEL]:      { OPEN: States.PAGE_OPEN },
  [States.PAGE_OPEN]:     { CLOSE: States.CAROUSEL },
  [States.TRANSITIONING]: {}
};

let currentState = States.CAROUSEL;

export function getState() {
  return currentState;
}

export function isTransitioning() {
  return currentState === States.TRANSITIONING;
}

export function tryTransition(action) {
  const allowed = transitions[currentState];
  if (allowed && allowed[action]) {
    const target = allowed[action];
    currentState = States.TRANSITIONING;
    return target;
  }
  return null;
}

export function completeTransition(targetState) {
  currentState = targetState;
}

export { States };
