## What

## Why

## Checks
- [ ] `cd packages/pot-index && ./test.sh` green (if the program changed)
- [ ] `cd apps/web && npx tsc --noEmit && npx next build --webpack` green
- [ ] Both themes checked (if UI changed)
- [ ] `docs/potfolio` updated (if behaviour changed)
- [ ] No secrets or keypairs in the diff
