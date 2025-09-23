#!/usr/bin/env node

// Example showing enhanced reactive discovery with flexible field name mapping
import { createReactiveRuntime, ui } from './dist/index.js';

console.log('🚀 Enhanced Reactive Discovery - Flexible Field Name Mapping');
console.log('=' .repeat(60));

const runtime = createReactiveRuntime(ui);

async function demonstrateFlexibleMapping() {
  try {
    console.log('\n📋 Approach 1: Automatic Field Name Extraction');
    console.log('Fields automatically mapped from their messages');

    const result1 = await runtime.ask(async ({ group, text, confirm }) => {
      const userSetup = await group(
        {
          message: "Auto-Mapped Fields",
          flow: "static",
          discovery: {
            mode: 'reactive',
            triggers: ['role'], // Uses automatic extraction: "Role (user/admin)" -> "role"
            debounceMs: 300
          }
        },
        async () => {
          const role = await text({ message: "Role (user/admin/moderator)" });
          const name = await text({ message: "Name" });

          if (role === "admin") {
            const accessCode = await text({ message: "Access code" });
            const email = await text({ message: "Email address" });
            return { role, name, accessCode, email };
          }

          const newsletter = await confirm({ message: "Subscribe to newsletter?" });
          return { role, name, newsletter };
        }
      );
      return { userSetup };
    });

    console.log('\n📊 Result 1:', JSON.stringify(result1, null, 2));

    console.log('\n📋 Approach 2: Explicit Field Message Mapping');
    console.log('Full control over field name mapping');

    const result2 = await runtime.ask(async ({ group, text, confirm }) => {
      const productSetup = await group(
        {
          message: "Product Configuration",
          flow: "static",
          discovery: {
            mode: 'reactive',
            triggers: {
              // Explicit mapping: field message -> trigger name
              "Select product type (basic/premium/enterprise)": "productType",
              "Choose deployment method (cloud/on-premise)": "deployment",
              "Target user group (individuals/teams/enterprises)": "userGroup"
            },
            debounceMs: 200
          }
        },
        async () => {
          const productType = await text({ message: "Select product type (basic/premium/enterprise)" });
          const deployment = await text({ message: "Choose deployment method (cloud/on-premise)" });

          if (productType === "premium" && deployment === "cloud") {
            const region = await text({ message: "Preferred cloud region" });
            const scaling = await confirm({ message: "Enable auto-scaling?" });
            return { productType, deployment, region, scaling };
          }

          if (productType === "enterprise") {
            const userGroup = await text({ message: "Target user group (individuals/teams/enterprises)" });
            const customization = await text({ message: "Customization requirements" });
            const support = await text({ message: "Support level needed" });
            return { productType, deployment, userGroup, customization, support };
          }

          const basicFeatures = await confirm({ message: "Include basic analytics?" });
          return { productType, deployment, basicFeatures };
        }
      );
      return { productSetup };
    });

    console.log('\n📊 Result 2:', JSON.stringify(result2, null, 2));

    console.log('\n📋 Approach 3: Mixed Configuration');
    console.log('Combination of automatic and explicit mapping');

    const result3 = await runtime.ask(async ({ group, text, confirm }) => {
      const accountSetup = await group(
        {
          message: "Account Setup",
          flow: "static",
          discovery: {
            mode: 'reactive',
            triggers: {
              // Mix explicit mapping with automatic extraction
              "Account type (personal/business/enterprise)": "accountType",
              // "Plan" will be auto-extracted from "Plan selection"
              // "Features" will be auto-extracted from "Features needed"
            },
            debounceMs: 250
          }
        },
        async () => {
          const accountType = await text({ message: "Account type (personal/business/enterprise)" });
          const plan = await text({ message: "Plan selection" });

          if (accountType === "business") {
            const teamSize = await text({ message: "Team size" });
            const features = await text({ message: "Features needed" });

            if (plan === "pro") {
              const integrations = await text({ message: "Required integrations" });
              const customDomain = await confirm({ message: "Need custom domain?" });
              return { accountType, plan, teamSize, features, integrations, customDomain };
            }

            return { accountType, plan, teamSize, features };
          }

          const personalFeatures = await text({ message: "Personal use features" });
          return { accountType, plan, personalFeatures };
        }
      );
      return { accountSetup };
    });

    console.log('\n📊 Result 3:', JSON.stringify(result3, null, 2));

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
  }
}

async function main() {
  await demonstrateFlexibleMapping();

  console.log('\n💡 Key Benefits of Enhanced Reactive Discovery:');
  console.log('   ✅ No hardcoded field names - works with any field messages');
  console.log('   ✅ Automatic field name extraction from messages');
  console.log('   ✅ Explicit field message -> trigger name mapping');
  console.log('   ✅ Mixed configuration support');
  console.log('   ✅ Fully backward compatible');
  console.log('   ✅ Progressive field revelation based on user choices');

  console.log('\n📚 Configuration Options:');
  console.log('   • triggers: ["fieldName1", "fieldName2"] - Auto-extract field names');
  console.log('   • triggers: { "Field message": "triggerName" } - Explicit mapping');
  console.log('   • triggers: { "Some field": "name", /* others auto */ } - Mixed approach');
}

main().catch(console.error);