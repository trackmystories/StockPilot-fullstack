const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const vm = require('node:vm');

function loadTsModule(file, requireMap = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  const module = {exports: {}};
  const localRequire = (id) => (id in requireMap ? requireMap[id] : require(id));
  const context = vm.createContext({module, exports: module.exports, require: localRequire, console, Date, JSON});
  new vm.Script(`(function(module,exports,require){${js}\n})(module,exports,require);`, {filename: file}).runInContext(context);
  return module.exports;
}

test('stores and restores the last known good payload by kind and symbol', async () => {
  const memory = new Map();
  const AsyncStorage = {
    getItem: async (key) => memory.get(key) ?? null,
    setItem: async (key, value) => memory.set(key, value),
    removeItem: async (key) => memory.delete(key),
  };
  const cache = loadTsModule(
    path.resolve(__dirname, '../savedStockDataCache.ts'),
    {'@react-native-async-storage/async-storage': {default: AsyncStorage}},
  );
  const payload = {symbol: 'ACHR', sourceRunId: 'run-1', scores: {quality: {score: 7}}};
  await cache.saveStockData('intelligence', 'achr', payload);
  const restored = await cache.loadStockData('intelligence', 'ACHR');
  assert.equal(restored.data.symbol, 'ACHR');
  assert.equal(restored.data.sourceRunId, 'run-1');
  assert.equal(typeof restored.cachedAt, 'number');
});

test('ignores malformed cached data', async () => {
  const AsyncStorage = {
    getItem: async () => '{bad json',
    setItem: async () => undefined,
    removeItem: async () => undefined,
  };
  const cache = loadTsModule(
    path.resolve(__dirname, '../savedStockDataCache.ts'),
    {'@react-native-async-storage/async-storage': {default: AsyncStorage}},
  );
  assert.equal(await cache.loadStockData('financials', 'ACHR'), null);
});