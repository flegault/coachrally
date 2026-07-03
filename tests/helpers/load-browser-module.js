const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

module.exports = function loadBrowserModule(filename, globalName) {
  const context = { window: {} };
  vm.createContext(context);
  const filenames = Array.isArray(filename) ? filename : [filename];
  filenames.forEach(item => vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', '..', item), 'utf8'), context));
  return context.window[globalName];
};
