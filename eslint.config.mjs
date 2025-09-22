import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import prettierConfig from 'eslint-config-prettier';

const convertToWarn = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([ruleName, ruleValue]) => {
      if (Array.isArray(ruleValue)) {
        return [ruleName, ['warn', ...ruleValue.slice(1)]];
      }

      return [ruleName, 'warn'];
    })
  );

const jsxA11yWarnRules = convertToWarn(jsxA11yPlugin.configs.recommended.rules);

const testingLibraryWarnRules = convertToWarn(testingLibraryPlugin.configs.react.rules);

const ignoreConfig = {
  ignores: ['src/apps/zen-go/vendor/wgo.min.js']
};

const baseLauncherConfig = {
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    },
    globals: {
      ...globals.browser,
      ...globals.es2022,
      process: 'readonly',
      module: 'readonly',
      require: 'readonly',
      global: 'readonly',
      __dirname: 'readonly',
      WGo: 'readonly'
    }
  },
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
    'jsx-a11y': jsxA11yPlugin
  },
  rules: {
    ...js.configs.recommended.rules,
    ...reactPlugin.configs.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    ...jsxA11yWarnRules,
    ...prettierConfig.rules,
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'react/no-unescaped-entities': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  },
  settings: {
    react: {
      version: '18.0'
    }
  }
};

const testingLibraryOverride = {
  files: ['src/**/*.{test,spec}.{js,jsx}'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2022,
      ...globals.jest
    }
  },
  plugins: {
    'testing-library': testingLibraryPlugin
  },
  rules: {
    ...testingLibraryWarnRules
  }
};

export default [ignoreConfig, baseLauncherConfig, testingLibraryOverride];
