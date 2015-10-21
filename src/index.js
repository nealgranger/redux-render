import { renderToString as render } from 'react-dom/server';
import { isFSA } from 'flux-standard-action';
import isPromise from 'is-promise';

export default function renderToString(element, store, count = 5) {
  console.log('render ', count);

  const markup = render(element);

  return Promise.all(store.renderStore.getState().promises).then(actions => {
    // TODO: Reset the list of promises.
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

  return function liftedReducer(liftedState = initialLiftedState, action) {
    let {
      storeState,
      promises
    } = liftedState;
    
    promises = appendPromise(promises, action);
    storeState = reducer(storeState, action);

    return  {
      storeState,
      promises
    }
  }
}

function unliftState(liftedState) {
  return liftedState.storeState;
}

function unliftStore(liftedStore, reducer) {
  return {
    ...liftedStore,
    renderStore: liftedStore,
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
