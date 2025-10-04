// Interactive test to see the tree in action
// Run with: npx tsx src/tests/interactive-test.ts

import { ask, group } from '../index.js';
import { text } from '../plugins/text/index.js';
import { confirm } from '../plugins/confirm/index.js';

async function interactiveTest() {
  console.log('🎮 Interactive Tree Test - Watch the Console for Tree Updates');
  console.log('='.repeat(60));

  const result = await ask(async ({ group: groupFn }) => {
    console.log('\n📝 Creating a flow with groups and fields...\n');

    return await groupFn(
      { id: 'main-group', label: 'Main Configuration' },
      async () => {
        const name = await text({
          id: 'user-name',
          label: 'What is your name?',
        });

        const useAdvanced = await confirm({
          id: 'use-advanced',
          label: 'Use advanced settings?',
        });

        if (useAdvanced) {
          const advanced = await groupFn(
            { id: 'advanced-group', label: 'Advanced Settings' },
            async () => {
              const setting1 = await text({
                id: 'advanced-setting-1',
                label: 'Advanced setting 1:',
              });

              const setting2 = await text({
                id: 'advanced-setting-2',
                label: 'Advanced setting 2:',
              });

              return { setting1, setting2 };
            },
            { flow: 'static' }
          );

          return { name, useAdvanced, advanced };
        }

        return { name, useAdvanced };
      },
      { flow: 'progressive' }
    );
  });

  console.log('\n✅ Flow completed! Final result:', result);
  console.log('\n💡 Tips:');
  console.log('  - Check the console output above for tree structure updates');
  console.log('  - Try using ESC to go back and see tree navigation in action');
  console.log('  - Each prompt should log "🌳 Tree updated for prompt: ..." messages');
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  interactiveTest().catch(console.error);
}