import { clearPromises } from './actions';

export default (render) => (store, { maxRenders = 1 }) => {
  const iterate = (renderCount = 0) => {
    const markup = render();
    const [ , { promises } ] = store.getState();
    store.dispatch(clearPromises());

    return Promise.all(promises).then(actions => {
      if (!actions.length || renderCount === maxRenders) {
        if (actions.length) {
          /* eslint-disable no-console */
          console.warn(`Render completed with unresolved promises. Specify a
            higher value for the \`additionalRenders\` parameter or reduce the
            depth of async action creators.`);
          /* eslint-enable no-console */
        }
        return markup;
      }
      return iterate(renderCount + 1);
    });
  };

  return () => iterate();
};
