const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadService(file, { expoGo, platform = 'android', googleModule = true }) {
  const nativeLoads = [];
  const nativeModule = {};
  const exports = {};
  const filename = path.join(__dirname, '..', 'src', 'services', file);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === 'expo') return { isRunningInExpoGo: () => expoGo };
      if (name === 'react-native') return {
        Platform: { OS: platform },
        TurboModuleRegistry: { get: () => googleModule ? {} : null },
      };
      nativeLoads.push(name);
      assert.equal(expoGo, false, `Native module loaded in Expo Go: ${name}`);
      return nativeModule;
    },
  }, { filename });
  return { exports, nativeLoads, nativeModule };
}

for (const file of ['google-sign-in.ts', 'native-notifications.ts']) {
  const method = file === 'google-sign-in.ts' ? 'getGoogleSignIn' : 'getNativeNotifications';
  const go = loadService(file, { expoGo: true });
  assert.equal(go.exports[method](), null);
  assert.equal(go.nativeLoads.length, 0);
  const native = loadService(file, { expoGo: false });
  assert.equal(native.exports[method](), native.nativeModule);
  assert.equal(native.nativeLoads.length, 1);
}
for (const options of [{ platform: 'web' }, { googleModule: false }]) {
  const service = loadService('google-sign-in.ts', { expoGo: false, ...options });
  assert.equal(service.exports.getGoogleSignIn(), null);
  assert.equal(service.nativeLoads.length, 0);
}
const notifications = loadService('native-notifications.ts', { expoGo: false });
notifications.exports.getNativeNotifications();
notifications.exports.getNativeNotifications();
assert.equal(notifications.nativeLoads.length, 1);
console.log('Expo Go native-module guards passed (7 cases).');
