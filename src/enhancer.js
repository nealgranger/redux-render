import { unliftAction, liftAction, lift } from 'redux-lift';
import isPromise from 'is-promise';

import { ADD_PROMISE, CLEAR_PROMISES, PASS_THROUGH } from './action-types';

import { addPromise } from './actions.js';

const liftState = (child, render = { promises: [] }) => [ child, render ];

const unliftState = ([ child ]) =>  child;

const getState = ([ , render ]) =>  render;

export const getPromises = (state) => getState(state).promises;

const updateState = (state, render) => liftState(unliftState(state), render);

const liftReducer = (reducer) => {
  const map = {
    [PASS_THROUGH]: (state, action) => {
      return liftState(
        reducer(unliftState(state), unliftAction(action)),
        getState(state)
      );
    },
    [ADD_PROMISE]: (state, { payload }) => {
      const currentState = getState(state);
      const { promises } = currentState;
      return updateState(state, {
        ...currentState,
        promises: [ ...promises, payload ],
      });
    },
    [CLEAR_PROMISES]: (state) => {
      const currentState = getState(state);
      return updateState(state, {
        ...currentState,
        promises: [],
      });
    },
    default: (state) => state,
  };

  return (state, action) => (map[action.type] || map.default)(state, action);
};

const liftDispatch = (dispatch) => (action) => {
  console.log("top level dispatch", action);
  if (isPromise(action.payload)) {
    dispatch(addPromise(action.payload));
  }

  dispatch(liftAction(PASS_THROUGH, action));
};

export default lift({
  liftReducer,
  liftState,
  unliftState,
  liftDispatch,
});
