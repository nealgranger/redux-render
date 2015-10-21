import {
  renderToString as reactRenderToString,
  renderToStaticMarkup as reactRenderToStaticMarkup,
} from 'react-dom/server';

import isPromise from 'is-promise';

export function createRender(render) {
  return function interate(element, store, additionalRenders = 1) {
    additionalRenders = additionalRenders - 1;
    // Call render to create any actions within components at mount.
    const markup = render(element);
    // Collect any promises that were created by actions.
    const promises = store.clearPromises();

    let status = 200;

    // Await the fulfillment of all promise actions or the fist rejection
    return Promise.all(promises).then(actions => {
      // TODO: Check action payloads for redirects.

      const state = store.getState();

      if (!actions.length || additionalRenders < 0 ) {
        if (additionalRenders < 0 && actions.length ) {
          console.warn(`Render completed with unresolved promises. Specify a
            higher value for the \`additionalRenders\` parameter or reduce the
            depth of async action creators.`);
        }
        return { markup, state, status };
      }

      return interate(element, store, additionalRenders);
    });
  };
}

export const renderToString = createRender(reactRenderToString);
export const renderToStaticMarkup = createRender(reactRenderToStaticMarkup);

function appendPromise(promises, action) {
  if (action.payload && isPromise(action.payload)) {
    promises = promises.concat([action.payload]);
  }
  return promises;
}

export function renderEnhancer() {
  return next => (reducer, initialState) => {
    const store = next(reducer, initialState);

    let promises = [];

    return {
      ...store,
      getPromises() {
        return promises;
      },
      clearPromises() {
        let temp = promises;
        promises = [];
        return temp;
      },
      dispatch(action) {
        promises = appendPromise(promises, action);
        return store.dispatch(action);
      },
    };
  }
}
