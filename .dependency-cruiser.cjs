/**
 * Feature-based architecture rules - ADR 0006.
 * Layers, import downward only: app -> features/core -> features/* -> shared.
 * Phase R0: every rule is `warn` (informational, build does not fail). They flip to
 * `error` in phase R4 once the cycles are gone and each slice exposes an index.ts.
 * The `no-deep-import` rule is added in R4 (it only makes sense once barrels exist).
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'No cyclic dependencies. Known cycles to remove: map<->reports (R2) and safety<->saved-areas (R3).',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-sibling-feature',
      severity: 'warn',
      comment:
        'A feature must not import a sibling feature. Move shared domain down to features/core, or lift composition up to the app route layer.',
      from: { path: '^src/features/(?!core/)([^/]+)/' },
      to: {
        path: '^src/features/(?!core/)([^/]+)/',
        pathNot: '^src/features/$1/',
      },
    },
    {
      name: 'core-no-feature-dep',
      severity: 'warn',
      comment: 'features/core holds reusable domain; it must not import a concrete (non-core) feature.',
      from: { path: '^src/features/core/' },
      to: { path: '^src/features/(?!core/)' },
    },
    {
      name: 'shared-no-upward',
      severity: 'warn',
      comment: 'shared is infrastructure with no domain; it must not import features or app.',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|app)/' },
    },
    {
      name: 'core-no-app',
      severity: 'warn',
      comment: 'features/core sits below the app layer; it must not import app.',
      from: { path: '^src/features/core/' },
      to: { path: '^src/app/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
