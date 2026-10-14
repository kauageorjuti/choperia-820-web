import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const directory = fileURLToPath(new URL('..',import.meta.url));
const action = process.argv[2];
if (!['build','start'].includes(action)) throw new Error('Use build ou start.');
if (action === 'start' && !existsSync(resolve(directory,'.next-build/BUILD_ID'))) {
  console.error('Execute npm run build:local antes de iniciar.');
  process.exit(1);
}
const args = action === 'build' ? ['build','--webpack'] : ['start','--hostname','127.0.0.1','--port','3000'];
const child = spawn(process.execPath,[resolve(directory,'node_modules/next/dist/bin/next'),...args],{
  cwd:directory,env:{...process.env,NEXT_BUILD_DIR:'.next-build'},stdio:'inherit'
});
child.on('exit',code => process.exit(code ?? 1));
