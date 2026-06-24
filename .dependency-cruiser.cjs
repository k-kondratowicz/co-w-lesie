/**
 * Feature-based architecture rules - ADR 0006.
 * Layers, import downward only: app -> features/* -> features/core -> shared.
 *
 * The isolation rules are `error` (the R1-R3 refactor brought them to zero). `shared-no-upward`
 * stays `warn` until R6 moves the remaining domain code (bdl/kmzb/risk/push) out of shared/lib.
 * `no-circular` is scoped to src/features; the pre-existing shared/ form+dialog barrel cycles are
 * out of scope for this architecture.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-feature-circular',
      severity: 'error',
      comment: 'No cyclic dependencies between feature/core modules.',
      from: { path: '^src/features/' },
      to: { circular: true, path: '^src/features/' },
    },
    {
      name: 'no-sibling-feature',
      severity: 'error',
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
      severity: 'error',
      comment: 'features/core holds reusable domain; it must not import a concrete (non-core) feature.',
      from: { path: '^src/features/core/' },
      to: { path: '^src/features/(?!core/)' },
    },
    {
      name: 'core-no-app',
      severity: 'error',
      comment: 'features/core sits below the app layer; it must not import app.',
      from: { path: '^src/features/core/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'core-public-api-only',
      severity: 'error',
      comment: 'Import a core slice through its index.ts, not an internal file.',
      from: { path: '^src/(app|features)/', pathNot: '^src/features/core/' },
      to: { path: '^src/features/core/[^/]+/(?!index\\.)..*' },
    },
    {
      name: 'core-cross-slice-public-api-only',
      severity: 'error',
      comment: 'A core slice importing another core slice must go through its index.ts.',
      from: { path: '^src/features/core/([^/]+)/' },
      to: {
        path: '^src/features/core/[^/]+/(?!index\\.)..*',
        pathNot: '^src/features/core/$1/',
      },
    },
    {
      name: 'shared-no-upward',
      severity: 'error',
      comment:
        'shared is infrastructure with no domain; it must not import features/app at runtime. Type-only imports are allowed - they are erased at build time, so no runtime/domain coupling (e.g. a shared store typing its payload with a core type).',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|app)/', dependencyTypesNot: ['type-only'] },
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
