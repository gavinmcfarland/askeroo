#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Get the example name from command line arguments
const exampleName = process.argv[2] || 'static';

// Check if the source example exists
const sourceExamplePath = join(projectRoot, 'examples', `${exampleName}.ts`);

if (!existsSync(sourceExamplePath)) {
	console.error(`❌ Example "${exampleName}" not found at ${sourceExamplePath}`);

	// List available examples
	const examplesDir = join(projectRoot, 'examples');
	if (existsSync(examplesDir)) {
		const availableExamples = readdirSync(examplesDir)
			.filter(file => file.endsWith('.ts'))
			.map(file => file.replace('.ts', ''))
			.join(', ');
		console.error(`Available examples: ${availableExamples}`);
	}
	process.exit(1);
}

console.log(`Running example: ${exampleName} \n`);

// Ensure dist/examples directory exists
const distExamplesDir = join(projectRoot, 'dist', 'examples');
mkdirSync(distExamplesDir, { recursive: true });

// Create a temporary tsconfig that includes the specific example
const tempTsConfig = {
	extends: './tsconfig.json',
	include: ['src/**/*', `examples/${exampleName}.ts`],
	compilerOptions: {
		outDir: './dist'
	}
};

// Write temp config
const tempConfigPath = join(projectRoot, 'tsconfig.temp.json');
writeFileSync(tempConfigPath, JSON.stringify(tempTsConfig, null, 2));

// Compile with the temp config
const compileChild = spawn('npx', [
	'tsc',
	'--project', 'tsconfig.temp.json'
], {
	stdio: 'inherit',
	cwd: projectRoot
});

compileChild.on('close', (compileCode) => {
	// Clean up temp config
	try {
		unlinkSync(tempConfigPath);
	} catch (e) {
		// Ignore cleanup errors
	}

	if (compileCode === 0) {
		const compiledPath = join(projectRoot, 'dist', 'examples', `${exampleName}.js`);
		const runChild = spawn('node', [compiledPath, '--', ...process.argv.slice(3)], {
			stdio: 'inherit',
			cwd: projectRoot
		});
		runChild.on('close', process.exit);
	} else {
		console.error('❌ Failed to compile example');
		process.exit(compileCode);
	}
});