// Global registry for prompt plugins
export type PromptPlugin = {
  type: string;
  prompt: (opts: any, engine: any, id: string) => Promise<any>;
  uiHandler?: Record<string, (...args: any[]) => Promise<any>>;
};

class PromptRegistry {
  private plugins: Map<string, PromptPlugin> = new Map();

  register(plugin: PromptPlugin): void {
    this.plugins.set(plugin.type, plugin);
  }

  get(type: string): PromptPlugin | undefined {
    return this.plugins.get(type);
  }

  getAll(): PromptPlugin[] {
    return Array.from(this.plugins.values());
  }

  getUIHandlers(): Record<string, (...args: any[]) => Promise<any>> {
    const handlers: Record<string, (...args: any[]) => Promise<any>> = {};

    for (const plugin of this.plugins.values()) {
      if (plugin.uiHandler) {
        Object.assign(handlers, plugin.uiHandler);
      }
    }

    return handlers;
  }
}

// Global singleton registry
export const globalRegistry = new PromptRegistry();

// Store current runtime context
let currentRuntime: any = null;

export function setCurrentRuntime(runtime: any): void {
  currentRuntime = runtime;
}

// Plugin creation function that auto-registers
export function createPlugin(config: Omit<PromptPlugin, 'type'> & { type: string }): (...args: any[]) => Promise<any> {
  const plugin: PromptPlugin = {
    type: config.type,
    prompt: config.prompt,
    uiHandler: config.uiHandler
  };

  // Auto-register the plugin
  globalRegistry.register(plugin);

  // Return the prompt function that users will call
  return async function(opts: any): Promise<any> {
    if (!currentRuntime) {
      throw new Error(`Plugin "${config.type}" must be used with a runtime. Make sure you're importing from a file that has called createRuntime().`);
    }

    // Call the dynamically created prompt function from the runtime
    const dynamicPrompt = currentRuntime[config.type];
    if (!dynamicPrompt) {
      throw new Error(`Plugin "${config.type}" is not available in the current runtime.`);
    }

    return dynamicPrompt(opts);
  };
}