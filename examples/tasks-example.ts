#!/usr/bin/env node
import { ask, tasks, TaskWarning } from '../src/index.js';

// Sleep helper function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const flow = async () => {
	await tasks([
		{
			label: 'Create component',
			action: async () => {
				await sleep(400);
			},
		},
		{
			label: 'Setup',
			concurrent: false,
			tasks: [
				{
					label: 'Generate files',
					action: async () => {
						await sleep(300);
					},
				},
				{
					label: 'Install dependencies',
					action: async () => {
						await sleep(500);
					},
				},
			],
		},
		{
			label: 'Parallel housekeeping',
			concurrent: true,
			tasks: [
				{
					label: {
						idle: 'Initializing git',
						running: 'Setting up git repository',
						done: 'Git initialized',
						error: 'Failed to initialize git'
					},
					action: async () => {
						await sleep(200);
					},
				},
				{
					label: {
						idle: 'Checking environment',
						running: 'Validating environment',
						done: 'Environment checked',
						error: 'Environment validation failed'
					},
					action: async () => {
						await sleep(200);
						// Demonstrate a warning that doesn't fail the run
						throw new TaskWarning('Node v18 detected; v20 recommended');
					},
				},
			],
		},
		{
			label: 'Finalize',
			action: async () => {
				await sleep(250);
				// Uncomment to see error handling
				// throw new Error('Network went brr');
			},
			continueOnError: false,
		},
	]);

	return 'Tasks completed!';
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\n" + result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();