#!/usr/bin/env node

import { ask, group, text, confirm } from "./dist/index.js";
import { validateRequired } from "./dist/utils.js";

const testFlow = async () => {
  console.log("🔹 Starting Profile group");
  const profile = await group({ message: "Profile" }, async () => {
    console.log("🔹 Executing firstName prompt");
    const first = await text({
      message: "First name",
      placeholder: "Enter your first name",
      validate: validateRequired,
    });

    console.log("🔹 Executing lastName prompt");
    const last = await text({
      message: "Last name",
      placeholder: "Enter your last name",
      validate: validateRequired,
    });

    console.log("🔹 Executing email prompt");
    const email = await text({
      message: "Email address",
      placeholder: "your@email.com",
      validate: validateRequired,
    });

    return { first, last, email };
  });

  console.log("🔹 Starting Preferences group");
  const prefs = await group({ message: "Preferences" }, async () => {
    console.log("🔹 Executing role prompt");
    const role = await text({
      message: "Role (user/admin)",
      placeholder: "user or admin",
      validate: (value) => {
        if (!["user", "admin"].includes(value.toLowerCase())) {
          return 'Role must be either "user" or "admin"';
        }
        return true;
      },
    });

    if (role.toLowerCase() === "admin") {
      console.log("🔹 Executing code prompt (admin path)");
      const code = await text({
        message: "Access code",
        placeholder: "Enter admin access code",
        validate: validateRequired,
      });
      return { role, code };
    }

    console.log("🔹 Executing newsletter prompt (user path)");
    const newsletter = await confirm({
      message: "Subscribe to newsletter?",
      initial: false,
    });

    console.log("🔹 Executing notifications prompt");
    const notifications = await confirm({
      message: "Enable email notifications?",
      initial: true,
    });

    return { role, newsletter, notifications };
  });

  return { profile, prefs };
};

// Test with regular ask function (no enhanced features)
console.log("🚀 Starting regular back navigation test");
console.log("💡 Press Esc at any prompt to go back");
ask(testFlow).then(result => {
  console.log("\n✅ Flow completed!");
  console.log("Result:", JSON.stringify(result, null, 2));
}).catch(error => {
  console.error("❌ Error:", error);
  process.exit(1);
});