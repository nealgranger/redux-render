import { Component, createElement } from 'react';
import {
  renderToString as reactRenderToString,
  renderToStaticMarkup as reactRenderToStaticMarkup,
} from 'react-dom/server';
import invariant from 'invariant';
import isPromise from 'is-promise';
import hoistStatics from 'hoist-non-react-statics';

export const ActionTypes = {
  DELAY_RENDER: '@@reduxRender/DELAY_RENDER',
}

const defaultMapPropsToActions = () => ({});

function getFunctionResult(func, ...args) {
  if (typeof func === 'function') {
    return func.apply(null, args);
  }
  return func;
}

function wrapAction(action) {
  return function() {
    if (action.delayRender) {
      return  {
        type: ActionTypes.DELAY_RENDER,
        payload: action,
      }
    }
    return action.create();
  }
}

export function connectRenderActions(createActions) {
  const finalCreateActions = createActions || defaultCreateActions;

  function dispatchActions(props) {
    const actions = finalCreateActions(props);


    actions.filter(action => !getFunctionResult(action.preventDispatch))
      .map(action => wrapAction(action))
      .forEach(createAction => props.dispatch(createAction()));
  }

  return function wrapWithFetch(WrappedComponent) {
    class ConnectRenderActions extends Component {

      constructor(props, context) {
        super(props, context);
        dispatchActions(this.props);
      }

      render() {
        return <WrappedComponent {...this.props} />;
      }
    }

    return hoistStatics(ConnectRenderActions, WrappedComponent);
  }
}

export function renderEnhancer() {
  return next => (reducer, initialState) => {
    const store = next(reducer, initialState);

    let promises = [];

    function wrapDispatch(dispatch) {
      return action => {
        if (action.type === ActionTypes.DELAY_RENDER) {

          console.log('action', action);

          const { create, delayRender } = action.payload;
          const createdAction = create();
          let promise = getFunctionResult(delayRender, createdAction);

          console.log('createdAction', createdAction);

          if (typeof promise === 'string') {
            promise = createdAction[promise];
          }

          invariant(
            isPromise(promise),
            '`delayRender` must return a promise. Instead received %s.',
            promise
          );

          promises = promises.concat([promise]);

          dispatch(createdAction);

        } else {
          dispatch(action);
        }
      }
    }

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
      dispatch: wrapDispatch(store.dispatch),
    };
  }
}

export function createRender(render) {
  return function interate(element, store, additionalRenders = 1) {
    additionalRenders = additionalRenders - 1;
    // Call render to create any actions within components at mount.
    const markup = render(element);
    // Collect any promises that were created by actions.
    const promises = store.clearPromises();

    // Await the fulfillment of all promise actions or the fist rejection
    return Promise.all(promises).then(actions => {

      if (!actions.length || additionalRenders < 0 ) {
        if (additionalRenders < 0 && actions.length ) {
          console.warn(`Render completed with unresolved promises. Specify a
            higher value for the \`additionalRenders\` parameter or reduce the
            depth of async action creators.`);
        }
        return markup;
      }

      return interate(element, store, additionalRenders);
    });
  };
}

export const renderToString = createRender(reactRenderToString);
export const renderToStaticMarkup = createRender(reactRenderToStaticMarkup);
