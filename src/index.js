import { renderToString } from 'react-dom/server';
import isPromise from 'is-promise';
import { compose, createStore, applyMiddleware } from 'redux';
import { isFSA } from 'flux-standard-action';

export class ReduxRender {

  promises = [];

  createStore({ middleware = [], reducer = {}, state = {} } = {}) {
    return compose.apply(null,
      [applyMiddleware(this.promiseMiddleware)].concat(middleware)
    )(createStore)(reducer, state);
  }

  consumePromises() {
    const _promises = this.promises;
    this.promises = [];
    return _promises;
  }

  storePromise(promise) {
    this.promises.push(promise);
    return promise;
  }

  then = (handler) => {
    return Promise.all(this.consumePromises())
      .then(actions => ({
        actions,
        state: this.getReduxState()
      })).then(handler);
  }

  promiseMiddleware = ({ dispatch, getState }) => {
    this.getReduxState = getState;

    return next => action => {

      if (!isFSA(action)) {
        if (isPromise(action)) {
          return this.storePromise(action.then(dispatch));
        }
      }

      if (isPromise(action.payload)) {
        return this.storePromise(action.payload.then(
          result => dispatch({ ...action, payload: result }),
          error => dispatch({ ...action, payload: error, error: true })
        ));
      }

      return next(action);
    }
  }

  renderToString = (element, count = 5) => {
    const markup = renderToString(element);

    return this.then(({ actions, state }) => {

      // TODO: Check action payloads for redirects and errors.

      if (!actions.length || --count === 0 ) {
        return { markup, state };
      }

      return this.renderToString(element, count)
    });
  }
}

export default function() {
  return new ReduxRender();
}
