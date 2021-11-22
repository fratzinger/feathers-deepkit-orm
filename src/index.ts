import { Service } from './Service';

const init = options => new Service(options);

export default init;

export { Service }

export * from './types';

if (typeof module !== 'undefined') {
  module.exports = Object.assign(init, module.exports);
}
