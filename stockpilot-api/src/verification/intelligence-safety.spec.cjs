const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const vm = require('node:vm');

function loadTsModule(file) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  const module = {exports: {}};
  const context = vm.createContext({module, exports: module.exports, require, console});
  new vm.Script(`(function(module,exports,require){${js}\n})(module,exports,require);`, {filename: file}).runInContext(context);
  return module.exports;
}

test('historical calculation version 3 remains readable after version 4 ships', () => {
  const versions = loadTsModule(path.resolve(__dirname, '../src/intelligence/calculation-version.ts'));
  assert.equal(versions.CALCULATION_VERSION, 4);
  assert.equal(versions.isReadableCalculationVersion(2), true);
  assert.equal(versions.isReadableCalculationVersion(3), true);
  assert.equal(versions.isReadableCalculationVersion(4), true);
  assert.equal(versions.isReadableCalculationVersion(5), false);
});

test('activation state retains current and two previous generations', () => {
  const state = loadTsModule(path.resolve(__dirname, '../src/intelligence/run-activation-state.ts'));
  const next = state.nextActivationState(
    {activeRun: 'run-c', previousActiveRun: 'run-b', recentActiveRuns: ['run-c', 'run-b', 'run-a']},
    'run-d',
  );
  assert.deepEqual(JSON.parse(JSON.stringify(next)), {
    activeRun: 'run-d',
    previousActiveRun: 'run-c',
    recentActiveRuns: ['run-d', 'run-c', 'run-b'],
  });
});

test('rollback restores previous active generation without deleting the failed generation', () => {
  const state = loadTsModule(path.resolve(__dirname, '../src/intelligence/run-activation-state.ts'));
  const next = state.rollbackActivationState(
    {activeRun: 'run-d', previousActiveRun: 'run-c', recentActiveRuns: ['run-d', 'run-c', 'run-b']},
    'run-d',
  );
  assert.deepEqual(JSON.parse(JSON.stringify(next)), {
    activeRun: 'run-c',
    previousActiveRun: 'run-d',
    recentActiveRuns: ['run-c', 'run-d', 'run-b'],
  });
});

test('expensive intelligence cron runs monthly instead of weekly', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/intelligence/jobs/weekly-intelligence.job.ts'), 'utf8');
  assert.match(source, /@Cron\('0 3 1 \* \*'/);
  assert.doesNotMatch(source, /@Cron\('0 3 \* \* 0'/);
});

test('staging preparation does not overwrite global published intelligence collections', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../src/intelligence/repositories/prepared-stock.repository.ts'),
    'utf8',
  );
  assert.doesNotMatch(source, /collection\(\s*['"]stockFinancials['"]\s*\)/);
  assert.doesNotMatch(source, /collection\(\s*['"]stockScorecards['"]\s*\)/);
  assert.doesNotMatch(source, /collection\(\s*['"]stockIntelligence['"]\s*\)/);
});

test('saved-input rebuild preserves rollback state instead of replacing the active pointer blindly', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/intelligence/saved-rebuild.ts'), 'utf8');
  assert.match(source, /nextActivationState/);
  assert.match(source, /previousActiveRun|recentActiveRuns|\.\.\.activation/);
});