#!/usr/bin/env node

import { ask, text } from "./dist/index.js";

const simpleFlow = async () => {
  console.log("📋 Starting flow");

  const first = await text({
    message: "First name",
    placeholder: "Enter first name"
  });

  console.log(`📋 Got first name: ${first}`);

  const last = await text({
    message: "Last name",
    placeholder: "Enter last name"
  });

  console.log(`📋 Got last name: ${last}`);

  return { first, last };
};

console.log("🚀 Starting simple debug test");
ask(simpleFlow).then(result => {
  console.log("✅ Result:", result);
}).catch(error => {
  console.error("❌ Error:", error);
});