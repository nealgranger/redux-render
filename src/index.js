import { renderToString } from 'react-dom/server';
import isPromise from 'is-promise';

function wait(element : Element) {

  const store = element.props.store;

  return new Promise((resolve, reject) => {
    function done() {
      if (--pending <= 0) {
        store.dispatch = store._dispatch;
        delete store._dispatch;
        resolve({ waited, markup });
      }
    }

    const promises = [ ];
    let pending = 0;
    let waited = false;
    let markup = '';

    store._dispatch = store.dispatch;
    store.dispatch = (...args) => {
      ++pending;
      const result = store._dispatch(...args);
      if (isPromise(result)) {
        waited = true;
        promises.push(result);
      } else {
        done();
      }
    }
    markup = renderToString(element);
    promises.forEach(promise => promise.then(done, done));
  });

}

function render(element : Element, count = 0) : Promise {
  return wait(element).then(({ waited, markup }) => {
    if (!waited || count > 5) {
      return Promise.resolve({ markup, count });
    }
    return render(element, count + 1);
  });
}

/**
 * Render a redux container.
 * @param {Element} container Redux container to render.
 * @returns {Promise} Promise containing render result.
 */
export default function(container : Element) : Promise {
  return new Promise((resolve, reject) => {
    if (!container || !container.props || !container.props.store) {
      return reject(new Error('Container must have a valid redux store.'));
    }
    return render(container.props.store)
  });
}
