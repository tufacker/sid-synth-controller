// Stand-in for Node for Max's max-api module: records outlets, keeps handlers.
const mock = {
  handlers: {},
  outlets: [],
  addHandlers(handlers) { Object.assign(mock.handlers, handlers); },
  addHandler(name, fn) { mock.handlers[name] = fn; },
  async outlet(...atoms) { mock.outlets.push(atoms); },
  post() {},
  _reset() { mock.handlers = {}; mock.outlets = []; }
};
module.exports = mock;
