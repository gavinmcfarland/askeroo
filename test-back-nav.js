#!/usr/bin/env node

import { ask, text } from "./dist/core-enhanced.js";

const testFlow = async () => {
  console.log("🔹 Executing firstName prompt");
  const firstName = await text({
    message: "First name",
    name: "firstName",
    placeholder: "Enter your first name"
  });

  console.log("🔹 Executing lastName prompt");
  const lastName = await text({
    message: "Last name",
    name: "lastName",
    placeholder: "Enter your last name"
  });

  console.log("🔹 Executing email prompt");
  const email = await text({
    message: "Email",
    name: "email",
    placeholder: "Enter your email"
  });

  return { firstName, lastName, email };
};

// Test with back navigation enabled
console.log("🚀 Starting back navigation test");
ask(testFlow, {
  enableBackNavigation: true,
  debugMode: true
}).then(result => {
  console.log("\n✅ Flow completed!");
  console.log("Result:", result);
}).catch(error => {
  console.error("❌ Error:", error);
  process.exit(1);
});