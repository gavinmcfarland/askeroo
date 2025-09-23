#!/usr/bin/env node

// Example showing how to use reactive discovery with the exported reactive runtime
import { createReactiveRuntime, ui } from './dist/index.js';

console.log('🚀 Reactive Discovery Usage Example');
console.log('=' .repeat(50));

// Create a reactive runtime instead of the regular runtime
const reactiveRuntime = createReactiveRuntime(ui);

async function demonstrateReactiveUsage() {
  try {
    console.log('\n📋 Using reactive discovery for progressive field revelation...\n');

    const result = await reactiveRuntime.ask(async ({ group, text, confirm }) => {
      const userSetup = await group(
        {
          message: "User Setup with Reactive Discovery",
          flow: "static",
          discovery: {
            mode: 'reactive',        // Enable reactive discovery
            triggers: ['role'],      // Fields that trigger re-discovery
            debounceMs: 300         // Debounce rapid changes
          }
        },
        async () => {
          const role = await text({ message: "Role (user/admin/moderator)" });
          const name = await text({ message: "Full Name" });

          if (role === "admin") {
            // Admin-specific fields appear together when role becomes "admin"
            const accessCode = await text({ message: "Admin Access Code" });
            const email = await text({ message: "Admin Email" });
            const department = await text({ message: "Department" });
            return { role, name, accessCode, email, department };
          }

          if (role === "moderator") {
            // Moderator-specific fields
            const permissions = await text({ message: "Moderator Permissions" });
            const region = await text({ message: "Moderation Region" });
            return { role, name, permissions, region };
          }

          // Regular user path
          const newsletter = await confirm({ message: "Subscribe to newsletter?" });
          const notifications = await confirm({ message: "Enable notifications?" });
          return { role, name, newsletter, notifications };
        }
      );

      return { userSetup };
    });

    console.log('\n📊 Final Result:');
    console.log(JSON.stringify(result, null, 2));

    // Show reactive discovery metrics
    const metrics = reactiveRuntime.getReactiveMetrics();
    console.log('\n📈 Reactive Discovery Metrics:');
    console.log(`   Field changes processed: ${metrics.fieldChanges}`);
    console.log(`   Errors encountered: ${metrics.errors}`);
    console.log(`   Current runtime phase: ${metrics.currentPhase}`);
    console.log(`   Discovery cache size: ${metrics.cacheSize}`);

    console.log('\n✅ Reactive discovery example completed successfully!');
    console.log('\n💡 Key Benefits:');
    console.log('   • Fields appear progressively based on user input');
    console.log('   • No overwhelming "wall of fields" initially');
    console.log('   • Smooth animations and transitions');
    console.log('   • Same logic as regular static groups');

  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
  }
}

async function main() {
  await demonstrateReactiveUsage();
}

main().catch(console.error);