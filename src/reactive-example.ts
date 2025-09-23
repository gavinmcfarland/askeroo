#!/usr/bin/env node

// Example demonstrating reactive discovery implementation
import { createReactiveRuntime } from './reactive-core.js';
// import { ask as originalAsk, group as originalGroup, text as originalText, confirm as originalConfirm } from './index.js';

// Create a UI that supports reactive discovery
const reactiveUI = {
  async text(msg: string, _initial?: string, groupContext?: string, id?: string): Promise<string> {
    console.log(`📝 TEXT PROMPT: "${msg}" (Group: ${groupContext || 'none'}, ID: ${id})`);

    // Simulate user responses for demo
    if (msg.includes('Role')) {
      const response = 'admin';
      console.log(`   User enters: "${response}"`);
      return response;
    }
    if (msg.includes('Name')) {
      const response = 'John Doe';
      console.log(`   User enters: "${response}"`);
      return response;
    }
    if (msg.includes('Access')) {
      const response = 'secret123';
      console.log(`   User enters: "${response}"`);
      return response;
    }
    if (msg.includes('Email')) {
      const response = 'john@example.com';
      console.log(`   User enters: "${response}"`);
      return response;
    }
    if (msg.includes('Subscription')) {
      const response = 'premium';
      console.log(`   User enters: "${response}"`);
      return response;
    }

    const response = `response-for-${msg}`;
    console.log(`   User enters: "${response}"`);
    return response;
  },

  async confirm(msg: string, _initial?: boolean, groupContext?: string, id?: string): Promise<boolean> {
    console.log(`❓ CONFIRM PROMPT: "${msg}" (Group: ${groupContext || 'none'}, ID: ${id})`);
    const response = msg.includes('newsletter') ? true : false;
    console.log(`   User selects: ${response}`);
    return response;
  },

  async showGroup(label: string | undefined, flow?: 'phase' | 'static', id?: string, discoveredFields?: Array<{id: string, message: string, type: string}>): Promise<void> {
    console.log(`\n🎯 === GROUP: ${label || 'Unnamed'} (${flow || 'sequential'}) ===`);
    console.log(`   Group ID: ${id}`);

    if (discoveredFields && discoveredFields.length > 0) {
      console.log(`   📋 Discovered Fields (${discoveredFields.length}):`);
      discoveredFields.forEach((field, index) => {
        console.log(`      ${index + 1}. ${field.type.toUpperCase()}: "${field.message}"`);
      });
    } else {
      console.log(`   📋 No fields discovered yet`);
    }
    console.log('   ================================\n');
  },

  clearGroup(): void {
    console.log(`🧹 Group cleared\n`);
  },

  cleanup(): void {
    console.log(`🧹 UI cleanup\n`);
  },

  async onFieldChange(fieldId: string, value: unknown, groupId: string): Promise<void> {
    console.log(`🔄 REACTIVE: Field "${fieldId}" changed to "${value}" in group "${groupId}"`);

    // Simulate reactive discovery - in a real implementation, this would trigger
    // the discovery engine to find new conditional fields
    if (fieldId.includes('role') && value === 'admin') {
      console.log(`   ⚡ Triggering discovery for admin role...`);
      // This would call the runtime's field change handler
    }

    if (fieldId.includes('subscription') && value === 'premium') {
      console.log(`   ⚡ Triggering discovery for premium subscription...`);
    }
  },

  async updateStaticGroupFields(groupId: string, fields: any[]): Promise<void> {
    console.log(`🎨 REACTIVE: Updating static group "${groupId}" with ${fields.length} fields`);
    fields.forEach((field, index) => {
      console.log(`      ${index + 1}. ${field.type}: "${field.message}" ${field.id ? `(ID: ${field.id})` : ''}`);
    });
  }
};

// Demo function comparing upfront vs reactive discovery
async function demonstrateReactiveDiscovery() {
  console.log('🚀 Reactive Discovery Implementation Demo');
  console.log('=' .repeat(60));

  // Create reactive runtime
  const reactiveRuntime = createReactiveRuntime(reactiveUI);

  console.log('\n📋 Test 1: Traditional Upfront Discovery');
  console.log('-'.repeat(40));

  try {
    const upfrontResult = await reactiveRuntime.ask(async ({ group, text, confirm }: any) => {
      const userSetup = await group(
        {
          message: "User Setup (Upfront)",
          flow: "static",
          discovery: { mode: 'upfront' } // Traditional approach
        },
        async () => {
          const role = await text({ message: "Role (user/admin)" });
          const name = await text({ message: "Name" });

          if (role === "admin") {
            const code = await text({ message: "Access code" });
            const email = await text({ message: "Email" });
            return { role, name, code, email };
          }

          const newsletter = await confirm({ message: "Subscribe to newsletter?" });
          return { role, name, newsletter };
        }
      );

      return { userSetup };
    });

    console.log('\n📊 Upfront Discovery Result:');
    console.log(JSON.stringify(upfrontResult, null, 2));

  } catch (error) {
    console.error('❌ Upfront discovery failed:', error);
  }

  console.log('\n📋 Test 2: New Reactive Discovery');
  console.log('-'.repeat(40));

  try {
    const reactiveResult = await reactiveRuntime.ask(async ({ group, text, confirm }: any) => {
      const userSetup = await group(
        {
          message: "User Setup (Reactive)",
          flow: "static",
          discovery: {
            mode: 'reactive',           // New reactive approach
            triggers: ['role'],         // Fields that trigger re-discovery
            debounceMs: 300            // Debounce rapid changes
          }
        },
        async () => {
          const role = await text({ message: "Role (user/admin)" });
          const name = await text({ message: "Name" });

          if (role === "admin") {
            const code = await text({ message: "Access code" });
            const email = await text({ message: "Email" });
            return { role, name, code, email };
          }

          const newsletter = await confirm({ message: "Subscribe to newsletter?" });
          return { role, name, newsletter };
        }
      );

      return { userSetup };
    });

    console.log('\n📊 Reactive Discovery Result:');
    console.log(JSON.stringify(reactiveResult, null, 2));

  } catch (error) {
    console.error('❌ Reactive discovery failed:', error);
  }

  console.log('\n📋 Test 3: Complex Reactive Example');
  console.log('-'.repeat(40));

  try {
    const complexResult = await reactiveRuntime.ask(async ({ group, text, confirm }: any) => {
      const subscription = await group(
        {
          message: "Subscription Setup",
          flow: "static",
          discovery: {
            mode: 'reactive',
            triggers: ['subscription', 'role'],  // Multiple trigger fields
            debounceMs: 200
          }
        },
        async () => {
          const subscriptionType = await text({ message: "Subscription type (basic/premium)" });
          const role = await text({ message: "Role (user/admin)" });

          // Premium subscription features
          if (subscriptionType === "premium") {
            const features = await text({ message: "Premium features" });

            if (role === "admin") {
              const adminPanel = await confirm({ message: "Enable admin panel?" });
              const billing = await text({ message: "Billing address" });
              return { subscriptionType, role, features, adminPanel, billing };
            }

            const support = await confirm({ message: "Priority support?" });
            return { subscriptionType, role, features, support };
          }

          // Basic subscription
          if (role === "admin") {
            const permissions = await text({ message: "Admin permissions" });
            return { subscriptionType, role, permissions };
          }

          const newsletter = await confirm({ message: "Subscribe to newsletter?" });
          return { subscriptionType, role, newsletter };
        }
      );

      return { subscription };
    });

    console.log('\n📊 Complex Reactive Result:');
    console.log(JSON.stringify(complexResult, null, 2));

  } catch (error) {
    console.error('❌ Complex reactive discovery failed:', error);
  }

  // Show performance metrics
  const metrics = reactiveRuntime.getReactiveMetrics();
  console.log('\n📈 Performance Metrics:');
  console.log(`   Field changes: ${metrics.fieldChanges}`);
  console.log(`   Errors: ${metrics.errors}`);
  console.log(`   Current phase: ${metrics.currentPhase}`);
  console.log(`   Cache size: ${metrics.cacheSize}`);

  console.log('\n✅ Demo completed!');
  console.log('=' .repeat(60));
}

// Comparison function showing both approaches side by side
async function compareApproaches() {
  console.log('\n🔄 Comparing Upfront vs Reactive Discovery');
  console.log('=' .repeat(60));

  console.log('\n📊 Summary of Differences:');
  console.log('');
  console.log('Upfront Discovery (Current):');
  console.log('  ✅ All fields discovered at group entry');
  console.log('  ✅ Simple, predictable execution');
  console.log('  ✅ No mid-execution state changes');
  console.log('  ❌ "Wall of fields" initial display');
  console.log('  ❌ Slightly longer initial load');
  console.log('');
  console.log('Reactive Discovery (New):');
  console.log('  ✅ Progressive field revelation');
  console.log('  ✅ More intuitive user experience');
  console.log('  ✅ Faster initial load');
  console.log('  ❌ More complex implementation');
  console.log('  ❌ Potential for UI updates/loading states');
  console.log('');

  console.log('🎯 Key Benefits of Reactive Discovery:');
  console.log('  1. Fields appear smoothly as conditions are met');
  console.log('  2. No overwhelming initial field display');
  console.log('  3. More responsive and dynamic feeling');
  console.log('  4. Better suited for complex conditional forms');
  console.log('  5. Maintains backward compatibility');
}

// Main execution
async function main() {
  try {
    await demonstrateReactiveDiscovery();
    await compareApproaches();
  } catch (error) {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { demonstrateReactiveDiscovery, compareApproaches };