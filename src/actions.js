import { CLEAR_PROMISES, ADD_PROMISE } from './action-types';

export const clearPromises = () => ({
  type: CLEAR_PROMISES,
});

export const addPromise = () => ({
  type: ADD_PROMISE,
});
