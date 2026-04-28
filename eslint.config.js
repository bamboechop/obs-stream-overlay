import antfu from '@antfu/eslint-config';

export default antfu(
  {
    stylistic: {
      semi: true,
    },
    vue: {
      overrides: {
        'vue/block-order': ['error', {
          order: ['template', 'script', 'style'],
        }],
        'vue/html-closing-bracket-newline': ['error', {
          singleline: 'never',
          multiline: 'never',
        }],
        'vue/html-self-closing': ['error', {
          html: {
            component: 'always',
            normal: 'never',
            void: 'always',
          },
        }],
        'vue/max-attributes-per-line': ['error', {
          multiline: 1,
          singleline: 1,
        }],
        'vue/define-macros-order': ['error', {
          order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'],
        }],
      },
    },
    yaml: false,
  },
  {
    rules: {
      'curly': ['error', 'all'],
      'no-console': ['error', { allow: ['debug', 'error', 'groupCollapsed', 'groupEnd', 'info', 'trace', 'warn'] }],
      'no-else-return': ['error', { allowElseIf: false }],
      'node/prefer-global/process': ['error', 'always'],
      'style/brace-style': ['error', '1tbs'],
    },
  },
);
