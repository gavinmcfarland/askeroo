import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";

/**
 * Enhanced spawn result that preserves ANSI colors from commands
 */
export interface ColoredSpawnResult extends EventEmitter {
	stdout: NodeJS.ReadableStream;
	stderr: NodeJS.ReadableStream;
	pid?: number;
}

/**
 * Spawn a command with automatic color preservation
 *
 * This function automatically enables ANSI colors in command output by:
 * 1. Using node-pty if available (creates real pseudo-TTY)
 * 2. Falling back to environment variables (FORCE_COLOR, etc.)
 *
 * @param command - Command to run
 * @param args - Command arguments
 * @param options - Additional spawn options
 * @returns EventEmitter with stdout, stderr streams and events
 *
 * @example
 * ```typescript
 * const git = spawnWithColors("git", ["status"]);
 * git.stdout.on("data", (data) => output.write(data.toString()));
 * git.on("close", (code) => console.log("Exit code:", code));
 * ```
 */
export function spawnWithColors(
	command: string,
	args: string[] = [],
	options: any = {}
): ColoredSpawnResult {
	// Try to use node-pty if available (best solution - real pseudo-TTY)
	try {
		const pty = require("node-pty");

		// Combine command and args for pty
		const fullCommand = [command, ...args].join(" ");

		const ptyProcess = pty.spawn(command, args, {
			name: "xterm-color",
			cols: process.stdout.columns || 80,
			rows: process.stdout.rows || 24,
			cwd: options.cwd || process.cwd(),
			env: { ...process.env, ...options.env },
		});

		// Create an EventEmitter to match spawn interface
		const emitter = new EventEmitter() as ColoredSpawnResult;

		// Create readable streams for stdout (pty combines stdout/stderr)
		const { Readable } = require("stream");
		const stdoutStream = new Readable({
			read() {},
		});
		const stderrStream = new Readable({
			read() {},
		});

		// Forward pty data to stdout stream
		ptyProcess.onData((data: string) => {
			stdoutStream.push(data);
		});

		// Handle exit
		ptyProcess.onExit(({ exitCode, signal }: any) => {
			stdoutStream.push(null); // End stream
			stderrStream.push(null);
			emitter.emit("close", exitCode, signal);
		});

		emitter.stdout = stdoutStream;
		emitter.stderr = stderrStream;
		emitter.pid = ptyProcess.pid;

		return emitter;
	} catch (error) {
		// node-pty not available or failed, fall back to regular spawn with color env vars
	}

	// Fallback: Use regular spawn with color-forcing environment variables
	const colorEnv = {
		...process.env,
		...options.env,
		// Force colors for various tools
		FORCE_COLOR: "1",
		CLICOLOR_FORCE: "1",
		// npm/yarn specific
		npm_config_color: "always",
		// Git specific
		GIT_CONFIG_PARAMETERS: "'color.ui=always'",
	};

	const proc = spawn(command, args, {
		...options,
		env: colorEnv,
	});

	// Create an EventEmitter to wrap the spawn result
	const emitter = new EventEmitter() as ColoredSpawnResult;

	// Forward all events from the child process
	proc.on("close", (code, signal) => emitter.emit("close", code, signal));
	proc.on("error", (err) => emitter.emit("error", err));
	proc.on("exit", (code, signal) => emitter.emit("exit", code, signal));

	// Attach streams
	emitter.stdout = proc.stdout;
	emitter.stderr = proc.stderr;
	emitter.pid = proc.pid;

	return emitter;
}
