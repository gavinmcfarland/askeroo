#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Get the example name from command line arguments
const exampleName = process.argv[2] || 'static';

// Check if the compiled example exists in dist
const compiledExamplePath = join(projectRoot, 'dist', 'examples', `${exampleName}.js`);

if (!existsSync(compiledExamplePath)) {
	console.error(`❌ Example "${exampleName}" not found at ${compiledExamplePath}`);
	console.error('💡 Run "npm run build" first to compile examples');

	// List available examples from source
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

// Run the compiled example
const runChild = spawn('node', [compiledExamplePath, '--', ...process.argv.slice(3)], {
	stdio: 'inherit',
	cwd: projectRoot
});

runChild.on('close', process.exit);
