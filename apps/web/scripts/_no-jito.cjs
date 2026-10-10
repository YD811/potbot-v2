// Preload for Node scripts: stub `jito-ts` (pulled in by @pythnetwork/solana-utils; it drags an
// old @solana/web3.js + rpc-websockets that fails to resolve under Node 22). We never bundle via
// Jito on devnet. Mirrors the `'jito-ts': false` webpack alias in next.config.mjs.
//   usage: NODE_OPTIONS=--require=./scripts/_no-jito.cjs npx tsx scripts/<script>.ts
const Module = require('node:module')
const orig = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request === 'jito-ts' || request.startsWith('jito-ts/')) return require.resolve('./_jito-stub.cjs')
  return orig.call(this, request, ...rest)
}
