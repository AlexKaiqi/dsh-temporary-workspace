import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { WorkspaceTypertGenerator } from '@deepseek-ai/dsh-typert-generator'

const workspace = resolve(import.meta.dirname, '..')
const [artifact] = new WorkspaceTypertGenerator(workspace)
  .generate(['dsh-temporary-session'], ['host'])

if (artifact === undefined || artifact.package !== 'dsh-temporary-session'
  || artifact.face !== 'host' || artifact.remote === undefined) {
  throw new Error('temporary-session: expected one Host artifact with Remote methods')
}

const output = resolve(workspace, artifact.packageRoot, 'lib')
await mkdir(output, { recursive: true })
await Promise.all([
  writeFile(resolve(output, 'typert.host.js'), artifact.js),
  writeFile(resolve(output, 'typert.host.d.ts'), artifact.dts),
  writeFile(resolve(output, 'typert.remote-client.js'), artifact.remote.js),
  writeFile(resolve(output, 'typert.remote-client.d.ts'), artifact.remote.dts),
  writeFile(resolve(output, 'typert.remote-client.d.ts.map'), artifact.remote.dtsMap),
])
