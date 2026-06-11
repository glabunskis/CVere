import coreWebVitals from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

// FSD layer-boundary rules (downward imports only: views→widgets→features→entities→shared).
// Each pattern object uses minimatch globs; message explains the violation.
const fsdLayerRules = [
  // shared: cannot import from any layer above it
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/entities/**'],
              message:
                'FSD: shared cannot import from entities. If required, add an eslint-disable comment and document the deviation in AGENTS.md.',
            },
            {
              group: ['@/features/**'],
              message: 'FSD: shared cannot import from features.',
            },
            {
              group: ['@/widgets/**'],
              message: 'FSD: shared cannot import from widgets.',
            },
            {
              group: ['@/views/**'],
              message: 'FSD: shared cannot import from views.',
            },
          ],
        },
      ],
    },
  },
  // entities: cannot import from features, widgets, or views
  {
    files: ['src/entities/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message: 'FSD: entities cannot import from features.',
            },
            {
              group: ['@/widgets/**'],
              message: 'FSD: entities cannot import from widgets.',
            },
            {
              group: ['@/views/**'],
              message: 'FSD: entities cannot import from views.',
            },
          ],
        },
      ],
    },
  },
  // features: cannot import from widgets or views
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/widgets/**'],
              message: 'FSD: features cannot import from widgets.',
            },
            {
              group: ['@/views/**'],
              message: 'FSD: features cannot import from views.',
            },
          ],
        },
      ],
    },
  },
  // widgets: cannot import from views
  {
    files: ['src/widgets/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/views/**'],
              message: 'FSD: widgets cannot import from views.',
            },
          ],
        },
      ],
    },
  },
];

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', '.claude/**'],
  },

  ...coreWebVitals,

  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', '^next', '^[a-z]'],
            ['^~', '^@'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
            ['^\\u0000'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  ...fsdLayerRules,

  eslintConfigPrettier,
];

export default config;
