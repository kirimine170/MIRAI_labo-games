# Scratch validation third-party notices

The validation harness installs dependencies only from the committed `package-lock.json` by using `npm ci --ignore-scripts`．The repository itself does not yet declare a license，so this package is marked `UNLICENSED` and is not a grant of redistribution rights．

## Direct runtime dependencies

| Package | Version | Source | Declared license |
| --- | --- | --- | --- |
| `@scratch/scratch-vm` | `15.0.1` | <https://www.npmjs.com/package/@scratch/scratch-vm>，<https://github.com/scratchfoundation/scratch-editor> | `AGPL-3.0-only` |
| `@scratch/scratch-storage` | `15.0.1` | <https://www.npmjs.com/package/@scratch/scratch-storage>，<https://github.com/scratchfoundation/scratch-editor> | `AGPL-3.0-only` |

The complete transitive dependency names，versions，integrity hashes，and registry URLs are recorded in `package-lock.json`．Their own license files and package metadata remain in the installed `node_modules` tree and must be reviewed before redistribution．

## Known dependency advisories

An explicit `npm audit --omit=dev` on 2026-08-14 reported advisories inherited through Scratch VM 15.0.1，including `hull.js` via `@scratch/scratch-render`，Immutable.js，and `uuid`．The harness does not attach Scratch Render，does not perform pixel rendering，and statically rejects unsafe or incompatible SB3 structure before VM execution．No unsupported dependency override is applied because it would violate the exact Scratch VM pin and could change Scratch semantics．Re-evaluate the audit and adapter before upgrading Scratch VM or accepting archives from outside this repository．
