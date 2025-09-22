import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

interface DebugEvent {
  timestamp: number;
  event: string;
  data?: any;
  stackTrace: string;
}

class DebugLogger {
  private isEnabled: boolean = false;
  private logFile: string = '';
  private events: DebugEvent[] = [];
  private hasCleanedUp: boolean = false;

  constructor() {
    this.isEnabled = process.argv.includes('--debug');
    if (this.isEnabled) {
      this.logFile = join(process.cwd(), `debug-${Date.now()}.log`);
      this.initLogFile();
      this.setupSignalHandlers();
    }
  }

  private setupSignalHandlers(): void {
    // Set up signal handlers immediately when debug is enabled
    const handleExit = () => {
      this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    // Handle exit event (synchronous)
    process.on('exit', () => {
      if (!this.hasCleanedUp) {
        // Force console output on exit
        process.stdout.write('\n🐛 Debug log saved to: ' + this.logFile + '\n');
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.log('UNCAUGHT_EXCEPTION', { error: error.message, stack: error.stack });
      this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.log('UNHANDLED_REJECTION', { reason });
      this.cleanup();
      process.exit(1);
    });
  }

  private initLogFile(): void {
    const header = `Debug Log - ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`;
    writeFileSync(this.logFile, header);
    this.log('DEBUG_INIT', 'Debug logging initialized');
  }

  private captureStackTrace(): string {
    const stack = new Error().stack || '';
    return stack
      .split('\n')
      .slice(3) // Remove the first 3 lines (Error message + this function + log function)
      .map(line => line.trim())
      .join('\n');
  }

  log(event: string, data?: any): void {
    if (!this.isEnabled) return;

    const debugEvent: DebugEvent = {
      timestamp: Date.now(),
      event,
      data,
      stackTrace: this.captureStackTrace()
    };

    this.events.push(debugEvent);

    const logEntry = this.formatLogEntry(debugEvent);
    appendFileSync(this.logFile, logEntry + '\n\n');
  }

  private formatLogEntry(event: DebugEvent): string {
    const timestamp = new Date(event.timestamp).toISOString();
    let entry = `[${timestamp}] ${event.event}`;

    if (event.data !== undefined) {
      entry += `\nData: ${JSON.stringify(event.data, null, 2)}`;
    }

    entry += `\nStack Trace:\n${event.stackTrace}`;
    entry += `\n${'-'.repeat(40)}`;

    return entry;
  }

  getLogFile(): string {
    return this.logFile;
  }

  isDebugEnabled(): boolean {
    return this.isEnabled;
  }

  hasPerformedCleanup(): boolean {
    return this.hasCleanedUp;
  }

  cleanup(): void {
    if (!this.isEnabled || this.hasCleanedUp) return;

    this.hasCleanedUp = true;
    this.log('DEBUG_CLEANUP', 'Debug session ended');
    console.log('\n🐛 Debug log saved to:', this.logFile);
  }
}

export const debugLogger = new DebugLogger();