// Example: Using shortMessage for better UX in long forms
import { createRuntime } from '../dist/core.js';
import { text } from '../dist/plugins/text/index.js';

// Mock UI to show the concept
const mockUI = {
  showGroup: () => {},
  clearGroup: () => {},
  cleanup: () => {},

  text: async (opts, currentGroup, id) => {
    console.log(`\n📝 Field: ${id}`);
    console.log(`   Full message: "${opts.message}"`);
    console.log(`   Short message: "${opts.shortMessage || 'none'}"`);
    return `sample-${id}`;
  }
};

async function longFormExample() {
  console.log('🎯 Long Form with shortMessage Example\n');
  console.log('This demonstrates how shortMessage improves the UX for forms with long, descriptive prompts\n');

  const runtime = createRuntime(mockUI);

  await runtime.ask(async ({ text }) => {
    // User registration form with verbose instructions but compact completed view
    await text({
      message: "Please enter your complete legal name exactly as it appears on your government-issued photo identification document (passport, driver's license, or state ID card)",
      shortMessage: "Legal name",
      id: "full_name"
    });

    await text({
      message: "Provide your primary email address where you would like to receive important account notifications, security alerts, and service updates",
      shortMessage: "Email address",
      id: "email"
    });

    await text({
      message: "Enter a secure password containing at least 8 characters with a mix of uppercase letters, lowercase letters, numbers, and special characters",
      shortMessage: "Password",
      id: "password"
    });

    await text({
      message: "Enter your complete residential mailing address including street number, street name, apartment/unit number (if applicable), city, state/province, and ZIP/postal code",
      shortMessage: "Mailing address",
      id: "address"
    });

    await text({
      message: "Provide your primary phone number including country code where we can reach you for account verification and important security notifications",
      shortMessage: "Phone number",
      id: "phone"
    });

    await text({
      message: "Enter your date of birth in MM/DD/YYYY format for age verification and account security purposes (this information will be kept private and secure)",
      shortMessage: "Date of birth",
      id: "birth_date"
    });

    console.log('\n✨ Benefits demonstrated:');
    console.log('  • Full context when user is actively filling the field');
    console.log('  • Compact labels for completed fields');
    console.log('  • Better screen space utilization');
    console.log('  • Improved form scanning and review');

    return "Registration complete!";
  });
}

longFormExample().catch(console.error);