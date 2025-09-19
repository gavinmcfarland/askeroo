#!/usr/bin/env node

// Start with the original working code and add simple back navigation
import { ask, group, text, confirm } from "./index.js";
import { validateRequired, validateEmail } from "./utils.js";

// Simple history tracking
let promptHistory: Array<{
  type: 'text' | 'confirm';
  config: any;
  value: any;
  timestamp: number;
}> = [];

let currentHistoryIndex = -1;

// Enhanced text function that tracks history
async function trackedText(config: any): Promise<string> {
  // If we're going back in history, return the stored value
  if (currentHistoryIndex >= 0 && currentHistoryIndex < promptHistory.length) {
    const historyEntry = promptHistory[currentHistoryIndex];
    if (historyEntry.type === 'text') {
      currentHistoryIndex++;
      return historyEntry.value;
    }
  }

  // Normal text prompt
  const value = await text(config);

  // Add to history
  promptHistory.push({
    type: 'text',
    config,
    value,
    timestamp: Date.now()
  });

  return value;
}

// Enhanced confirm function that tracks history
async function trackedConfirm(config: any): Promise<boolean> {
  // If we're going back in history, return the stored value
  if (currentHistoryIndex >= 0 && currentHistoryIndex < promptHistory.length) {
    const historyEntry = promptHistory[currentHistoryIndex];
    if (historyEntry.type === 'confirm') {
      currentHistoryIndex++;
      return historyEntry.value;
    }
  }

  // Normal confirm prompt
  const value = await confirm(config);

  // Add to history
  promptHistory.push({
    type: 'confirm',
    config,
    value,
    timestamp: Date.now()
  });

  return value;
}

const simpleEnhancedFlow = async () => {
  console.log(`\n📍 Current step: 1 of 6 prompts`);

  const profile = await group({ message: "Profile" }, async () => {
    const first = await trackedText({
      message: "First name",
      placeholder: "Enter your first name",
      validate: validateRequired,
    });

    console.log(`\n📍 Current step: 2 of 6 prompts (can go back)`);

    const last = await trackedText({
      message: "Last name",
      placeholder: "Enter your last name",
      validate: validateRequired,
    });

    console.log(`\n📍 Current step: 3 of 6 prompts (can go back)`);

    const email = await trackedText({
      message: "Email address",
      placeholder: "your@email.com",
      validate: (value: string) => {
        const required = validateRequired(value);
        if (required !== true) return required;
        return validateEmail(value);
      },
    });

    return { first, last, email };
  });

  console.log(`\n📍 Current step: 4 of 6 prompts (can go back)`);

  const prefs = await group({ message: "Preferences" }, async () => {
    const role = await trackedText({
      message: "Role (user/admin)",
      placeholder: "user or admin",
      validate: (value: string) => {
        if (!["user", "admin"].includes(value.toLowerCase())) {
          return 'Role must be either "user" or "admin"';
        }
        return true;
      },
    });

    if (role.toLowerCase() === "admin") {
      console.log(`\n📍 Current step: 5 of 6 prompts (can go back)`);

      const code = await trackedText({
        message: "Access code",
        placeholder: "Enter admin access code",
        validate: validateRequired,
      });
      return { role, code };
    }

    console.log(`\n📍 Current step: 5 of 6 prompts (can go back)`);

    const newsletter = await trackedConfirm({
      message: "Subscribe to newsletter?",
      initial: false,
    });

    console.log(`\n📍 Current step: 6 of 6 prompts (can go back)`);

    const notifications = await trackedConfirm({
      message: "Enable email notifications?",
      initial: true,
    });

    return { role, newsletter, notifications };
  });

  return { profile, prefs };
};

// Function to simulate going back
function goBack(): boolean {
  if (promptHistory.length <= 1) {
    console.log('\n⚠️  Cannot go back - this is the first prompt');
    return false;
  }

  // Remove the last two entries (current and go back to previous)
  promptHistory.pop(); // Remove current
  const previousPrompt = promptHistory.pop(); // Remove and get previous

  if (previousPrompt) {
    console.log(`\n🔄 Going back to: ${previousPrompt.config.message}`);
    // Set history index to replay from this point
    currentHistoryIndex = promptHistory.length;
    return true;
  }

  return false;
}

// Run the simple enhanced example
async function runSimpleEnhancedExample() {
  try {
    console.log("🚀 Welcome to Simple Enhanced Askeroo CLI Demo!\n");
    console.log("✨ This version demonstrates basic history tracking!");
    console.log("💡 This is a proof of concept for back navigation.\n");

    const result = await ask(simpleEnhancedFlow);

    console.log("\n🎉 Simple enhanced flow completed!");
    console.log("History captured:", promptHistory.length, "prompts");
    console.log("Results:", JSON.stringify(result, null, 2));

    // Show what back navigation would look like
    console.log("\n🔄 Back navigation demo:");
    console.log("History entries:");
    promptHistory.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.config.message}: ${entry.value}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSimpleEnhancedExample();
}