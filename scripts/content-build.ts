/**
 * 一鍵內容建置：slicer → 造題 → 驗證 + 覆蓋率報告。
 * 用法：npm run content:build
 */
import { execFileSync } from 'child_process';
import { join } from 'path';

const root = join(__dirname, '..');
const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function run(script: string) {
  console.log(`\n▶ 執行 ${script} ...`);
  execFileSync(process.execPath, [tsxCli, join(root, 'scripts', script)], { stdio: 'inherit' });
}

try {
  run('run-slicer.ts');
  run('gen-questions.ts');
  run('content-validate.ts');
  console.log('\n✅ 內容建置完成');
} catch {
  console.error('\n❌ 內容建置中斷，請檢視上方錯誤訊息');
  process.exit(1);
}
