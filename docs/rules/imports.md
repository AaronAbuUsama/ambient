# Imports name the module

## The rule

A module names another module by what it **is**, never by how far away it happens to
sit:

```ts
import { openHome } from "~/modules/home/service.ts";   // yes
import { openHome } from "../../home/service.ts";       // no
```

`~/` resolves from `src/`. No import path contains `../..`. Inside a module, `./` and a
single `../` are fine.

**No module imports another module's `internal/`.** `types.ts` and `service.ts` are what
callers may know; `internal/` is what only that module knows.

## Why

**`internal/` is the seam, and an import is the only thing that can break it.** The
module shape means nothing if `cli` can reach `home/internal/disk.ts` and start joining
paths — which is precisely the failure ADR 001 exists to prevent, where every caller
learned the layout. A rule about privacy that nothing enforces is a comment.

**A relative path encodes distance, and distance changes.** `../../home/service.ts`
breaks when either end moves, and it reads as "two levels up" rather than "the home
module" — so a reviewer cannot tell a cross-module dependency from a local one at a
glance. The alias is declared once, in `vite.config.ts` and `tsconfig.json`, and it
makes cross-module imports visible in a grep.

## The check

`vp run shape` — names the file and line of any `~/modules/<other>/internal` import from
outside the owning module, and of any `../..` in an import path.
