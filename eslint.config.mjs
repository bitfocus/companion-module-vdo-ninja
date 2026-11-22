import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'
import vitest from '@vitest/eslint-plugin'

export default [
	// The vitest configs aren't part of the tsconfig, so skip type-aware linting of them
	{
		ignores: ['vitest.config.ts', 'vitest.e2e.config.ts', '.vdo-ninja/**'],
	},
	...(await generateEslintConfig({
		enableTypescript: true,
	})),
	{
		files: ['src/__tests__/**/*'],
		plugins: { vitest },
		rules: {
			...vitest.configs.recommended.rules,
			// Tests may import devDependencies (vitest, playwright)
			'n/no-unpublished-import': 'off',
		},
	},
]
