// dist/ 빌드 결과를 저장소 루트(GitHub Pages 배포 위치)로 복사한다.
// 이전 빌드의 해시 파일이 쌓이지 않도록 루트의 assets/ 를 먼저 비운다.
import { rmSync, cpSync } from 'node:fs'
const root = new URL('../', import.meta.url)
rmSync(new URL('assets/', root), { recursive: true, force: true })
cpSync(new URL('dist/', import.meta.url), root, { recursive: true })
console.log('deployed dist/ → repo root')
