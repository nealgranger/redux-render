# redux-render

Async rendering for [redux] containers.

Although [redux-thunk] has good support for waiting for the result of dispatches it still requires you to explicitly account for all the dispatches you want to make as part of your rendering flow. The more "smart" containers you have that dispatch requests to fetch data on load the more convoluted your setup becomes. So forget about it and just use [redux-render].

```javascript
import renderToString from 'redux-render';
import App from '...';
import createStore from '...';

const store = createStore();

// IMPORTANT: You have to pass a component that has a `store` property.
renderToString(<App store={store}/>).then(({ markup, count }) => {
  console.log(`Rendered in ${count} iterations.`);
  console.log(markup);
});
```

It works, sheepishly, by overriding a store's `dispatch` method and observing the results of actions that have been dispatched. If a promise is ever returned from a dispatch then its result is waited for; when all promises have resolved then the container is re-rendered. The process is repeated for as long as promises are generated on a render tick.

[redux]: https://github.com/gaearon/redux
[redux-thunk]: https://github.com/gaearon/redux-thunk
[redux-render]: https://github.com/izaakschroeder/redux-render
