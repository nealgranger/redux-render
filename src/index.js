import { renderToString as render } from 'react-dom/server';
import { isFSA } from 'flux-standard-action';
import isPromise from 'is-promise';

const ActionTypes = {
  PERFORM_ACTION: 'PERFORM_ACTION',
  RESET_PROMISES: 'RESET_PROMISES',
  INIT: '@@redux/INIT'
}

export default function renderToString(element, store, count = 5) {
  console.log('render ', count);

  const markup = render(element);

  return Promise.all(store.renderStore.getState().promises).then(actions => {
    store.renderStore.dispatch({ type: ActionTypes.RESET_PROMISES });

    // TODO: Check action payloads for redirects and errors.

    if (!actions.length || --count === 0 ) {
      const status = 200;
      const state = store.getState();
      return { markup, state, status };
    }

    return this.renderToString(element, count)
  });
}

function appendPromise(promises, action) {
  if (!isFSA(action)) {
    if (isPromise(action)) {
      return promises.concat([action]);
    }
  }

  if (isPromise(action.payload)) {
    return promises.concat([action]);
  }

  return promises;
}

function liftReducer(reducer, initialState) {
  const initialLiftedState = {
    storeState: initialState,
    promises: []
  };

  return function liftedReducer(liftedState = initialLiftedState, liftedAction) {
    let {
      storeState,
      promises
    } = liftedState;

    switch(liftedAction.type) {
    case ActionTypes.INIT:
      storeState = reducer(storeState, liftedAction);
      break;
    case ActionTypes.PERFORM_ACTION:
      promises = appendPromise(promises, liftedAction.action);
      storeState = reducer(storeState, liftedAction.action);
      break;
    case ActionTypes.RESET_PROMISES:
      promises = []
      break;
    }

    return  {
      storeState,
      promises
    }
  }
}


function liftAction(action) {
  const liftedAction = {
    type: ActionTypes.PERFORM_ACTION,
    action
  };
  return liftedAction;
}


function unliftState(liftedState) {
  return liftedState.storeState;
}

function unliftStore(liftedStore, reducer) {
  return {
    ...liftedStore,
    renderStore: liftedStore,
    dispatch(action) {
      liftedStore.dispatch(liftAction(action));
      return action;
    },
    getState() {
      const state = unliftState(liftedStore.getState());
      return state;
    },
    getReducer() {
      return reducer;
    },
    replaceReducer(nextReducer) {
      liftedStore.replaceReducer(liftReducer(nextReducer));
    }
  }
}


export function renderMiddleware() {
  return next => (reducer, initialState) => {
    const liftedReducer = liftReducer(reducer, initialState);
    const liftedStore = next(liftedReducer);
    const store = unliftStore(liftedStore, reducer);
    return store;
  }
}
