# Cubby UI registry in Linket

## Status: registry enabled, global theme unchanged

Linket uses **React 19, Tailwind CSS 4, TypeScript, Base UI, and shadcn
`base-luma`**. The project already depends on `@base-ui/react` and `shadcn`.
No dependency reinstallation or new shadcn initialization is required.

The explicit `@cubby-ui` registry entry in `components.json` points to
`https://cubby-ui.dev/r/{name}.json`. The official shadcn registry directory
also resolves this namespace automatically. The application root has the
`.root` stacking boundary used by Base UI portals.

Use the installed CLI from the repository root when selectively adding a
component in a dedicated UI branch:

```bash
npx shadcn add @cubby-ui/data-table
# Or another component once its behavior and API have been reviewed:
npx shadcn add @cubby-ui/button
```

Review the generated changes **before committing**: the CLI can add source,
dependencies, theme variables and styles. Linket already has its own Table,
Button, Card, Badge and utility wrappers. Do not replace these shared
components merely to adopt a different look; prefer the existing wrappers on
production screens, especially for the Overview Recent Orders table.

### Cubby theme adoption policy

**Do not run `shadcn init @cubby-ui/style` on Linket.** That is a new-project
scaffold operation which may rewrite the existing `components.json` and
`resources/client/app.css`. Likewise, do not run `shadcn add @cubby-ui/style`
on `main`, because that would import a second global palette and override
Linket's branded, accessible light/dark semantic tokens.

For a future **opt-in** Cubby visual experiment:

1. Use a separate branch/worktree; inspect `npx shadcn add @cubby-ui/style`
   there and review the generated CSS diff.
2. Move only needed non-conflicting utilities/animations into an explicitly
   scoped experimental stylesheet or component. Preserve Linket's `--be-*`,
   `--primary`, `--background`, status tokens and dark mode.
3. Review portal layering, keyboard focus, RTL, contrast, 200% zoom, mobile
   reflow, and regression tests before using a Cubby component in a
   production view.

The registry entry and isolated root are **ready for selective installs**;
the Cubby global theme and Cubby component copies are intentionally **not**
installed as part of the Recent Orders polish. The Overview uses the existing
shadcn table primitives, with responsive mobile rows and full order states.

### References

- https://www.cubby-ui.dev/docs/getting-started/installation
- https://ui.shadcn.com/docs/registry/getting-started
- `DESIGN.md` — Linket token, spacing, RTL and accessibility rules
