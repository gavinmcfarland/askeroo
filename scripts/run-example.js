#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Get the example name from command line arguments
const exampleName = process.argv[2] || 'static';

// Check if the compiled example exists
const examplePath = join(projectRoot, 'dist', 'examples', `${exampleName}.js`);

if (!existsSync(examplePath)) {
	console.error(`❌ Example "${exampleName}" not found at ${examplePath}`);
	console.error(`Available examples: static, phased`);
	process.exit(1);
}

// Run the example
console.log(`Running example: ${exampleName} \n`);
const child = spawn('node', [examplePath, '--', ...process.argv.slice(3)], {
	stdio: 'inherit',
	cwd: projectRoot
});

child.on('close', (code) => {
	process.exit(code);
});
