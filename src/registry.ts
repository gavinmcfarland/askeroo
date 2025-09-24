import React from 'react';

// Global registry for prompt plugins
export type PromptPlugin = {
  type: string;
  component: React.ComponentType<any>; // Plugin provides its own React component
  prompt: (opts: any, engine: any, id: string) => Promise<any>;
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


  getComponent(type: string): React.ComponentType<any> | undefined {
    const plugin = this.plugins.get(type);
    return plugin?.component;
  }

  getComponents(): Record<string, React.ComponentType<any>> {
    const components: Record<string, React.ComponentType<any>> = {};

    for (const [type, plugin] of this.plugins.entries()) {
      if (plugin.component) {
        components[type] = plugin.component;
      }
    }

    return components;
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
export function createPlugin<T = any, R = any>(config: {
  type: string;
  component: React.ComponentType<any>;
  prompt: (opts: T, engine: any, id: string) => Promise<R>;
}): (opts: T) => Promise<R> {
  const plugin: PromptPlugin = {
    type: config.type,
    component: config.component,
    prompt: config.prompt
  };

  // Auto-register the plugin
  globalRegistry.register(plugin);

  // Return the prompt function that users will call
  return async function(opts: T): Promise<R> {
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