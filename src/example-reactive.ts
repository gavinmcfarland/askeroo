#!/usr/bin/env node

// Example demonstrating reactive discovery in real-world scenarios
import { createReactiveRuntime, ui } from "./index.js";

// Import plugins after runtime is established
import { multi } from "./custom-prompt-multi.js";
import { customText } from "./custom-text-plugin.js";

// Create reactive runtime instead of regular runtime
const reactiveRuntime = createReactiveRuntime(ui);

const flow = async () => {
	const name = await reactiveRuntime.text({ message: "Single" });

	// Example of custom text input plugin with different styling
	const customName = await customText({
		message: "Enter your custom name",
		placeholder: "e.g. John Doe",
		prefix: "✨",
	});

	// 🚀 REACTIVE DISCOVERY EXAMPLE 1: Role-based fields
	// Fields appear progressively as role changes
	const prefs2 = await reactiveRuntime.group(
		{
			message: "User Preferences (Reactive)",
			flow: "static",
			discovery: {
				mode: 'reactive',           // Enable reactive discovery
				triggers: ['role'],         // Re-discover when role field changes
				debounceMs: 300            // Debounce rapid changes
			}
		},
		async () => {
			const role = await reactiveRuntime.text({ message: "Role (user/admin/moderator)" });
			const name = await reactiveRuntime.text({ message: "Name" });

			if (role === "admin") {
				// These admin fields appear together when role becomes "admin"
				const code = await reactiveRuntime.text({ message: "Admin Access Code" });
				const email = await reactiveRuntime.text({ message: "Admin Email" });
				const department = await reactiveRuntime.text({ message: "Department" });
				return { role, name, code, email, department };
			}

			if (role === "moderator") {
				// These moderator fields appear when role becomes "moderator"
				const permissions = await reactiveRuntime.text({ message: "Moderation Permissions" });
				const region = await reactiveRuntime.text({ message: "Moderation Region" });
				return { role, name, permissions, region };
			}

			// Regular user fields - appear initially
			const news = await reactiveRuntime.confirm({ message: "Subscribe to newsletter?" });
			const notifications = await reactiveRuntime.confirm({ message: "Enable notifications?" });
			return { role, name, news, notifications };
		}
	);

	// 🚀 REACTIVE DISCOVERY EXAMPLE 2: Subscription-based features
	// Multiple trigger fields with explicit field name mapping
	const subscriptionSetup = await reactiveRuntime.group(
		{
			message: "Subscription Setup (Reactive)",
			flow: "static",
			discovery: {
				mode: 'reactive',
				triggers: {
					// Explicit field message -> trigger name mapping
					"Subscription (basic/premium/enterprise)": "subscription",
					"User Type (individual/business)": "userType"
				},
				debounceMs: 200
			}
		},
		async () => {
			const subscription = await reactiveRuntime.text({ message: "Subscription (basic/premium/enterprise)" });
			const userType = await reactiveRuntime.text({ message: "User Type (individual/business)" });

			// Premium features appear when subscription becomes "premium"
			if (subscription === "premium") {
				const premiumFeatures = await reactiveRuntime.text({ message: "Premium Features Selection" });

				if (userType === "business") {
					// Business premium gets additional fields
					const teamSize = await reactiveRuntime.text({ message: "Team Size" });
					const billingContact = await reactiveRuntime.text({ message: "Billing Contact Email" });
					return { subscription, userType, premiumFeatures, teamSize, billingContact };
				}

				const prioritySupport = await reactiveRuntime.confirm({ message: "Enable Priority Support?" });
				return { subscription, userType, premiumFeatures, prioritySupport };
			}

			// Enterprise features appear when subscription becomes "enterprise"
			if (subscription === "enterprise") {
				const customIntegration = await reactiveRuntime.text({ message: "Custom Integration Requirements" });
				const dedicatedManager = await reactiveRuntime.confirm({ message: "Assign Dedicated Account Manager?" });
				const sla = await reactiveRuntime.text({ message: "SLA Requirements" });

				if (userType === "business") {
					const companySize = await reactiveRuntime.text({ message: "Company Size (employees)" });
					return { subscription, userType, customIntegration, dedicatedManager, sla, companySize };
				}

				return { subscription, userType, customIntegration, dedicatedManager, sla };
			}

			// Basic subscription - minimal fields
			const basicNewsletter = await reactiveRuntime.confirm({ message: "Subscribe to newsletter?" });
			return { subscription, userType, basicNewsletter };
		}
	);

	// Example of custom multi-select prompt plugin (works with reactive discovery)
	const colors = await multi({
		message: "Select your favorite colors",
		options: ["red", "green", "blue", "yellow", "purple"],
	});

	// 🚀 REACTIVE DISCOVERY EXAMPLE 3: Dynamic form based on preferences
	// Shows how reactive discovery works with automatic field name extraction
	const dynamicForm = await reactiveRuntime.group(
		{
			message: "Dynamic Form (Reactive)",
			flow: "static",
			discovery: {
				mode: 'reactive',
				triggers: ['form', 'complexity'],  // Auto-extracted from field messages
				debounceMs: 250
			}
		},
		async () => {
			const formType = await reactiveRuntime.text({ message: "Form Type (contact/survey/registration)" });
			const complexity = await reactiveRuntime.text({ message: "Complexity (simple/advanced)" });

			// Contact form fields
			if (formType === "contact") {
				const contactName = await reactiveRuntime.text({ message: "Contact Name" });
				const contactEmail = await reactiveRuntime.text({ message: "Contact Email" });

				if (complexity === "advanced") {
					const company = await reactiveRuntime.text({ message: "Company" });
					const phone = await reactiveRuntime.text({ message: "Phone Number" });
					const subject = await reactiveRuntime.text({ message: "Subject" });
					const message = await reactiveRuntime.text({ message: "Message" });
					return { formType, complexity, contactName, contactEmail, company, phone, subject, message };
				}

				const simpleMessage = await reactiveRuntime.text({ message: "Message" });
				return { formType, complexity, contactName, contactEmail, simpleMessage };
			}

			// Survey form fields
			if (formType === "survey") {
				const surveyTitle = await reactiveRuntime.text({ message: "Survey Title" });

				if (complexity === "advanced") {
					const demographics = await reactiveRuntime.confirm({ message: "Collect Demographics?" });
					const multipleChoice = await reactiveRuntime.confirm({ message: "Include Multiple Choice?" });
					const openEnded = await reactiveRuntime.confirm({ message: "Include Open-Ended Questions?" });
					const rating = await reactiveRuntime.confirm({ message: "Include Rating Questions?" });
					return { formType, complexity, surveyTitle, demographics, multipleChoice, openEnded, rating };
				}

				const basicQuestions = await reactiveRuntime.text({ message: "Number of Questions" });
				return { formType, complexity, surveyTitle, basicQuestions };
			}

			// Registration form fields
			if (formType === "registration") {
				const username = await reactiveRuntime.text({ message: "Username" });
				const email = await reactiveRuntime.text({ message: "Email" });

				if (complexity === "advanced") {
					const profile = await reactiveRuntime.text({ message: "Profile Information" });
					const preferences = await reactiveRuntime.text({ message: "User Preferences" });
					const verification = await reactiveRuntime.confirm({ message: "Email Verification Required?" });
					const terms = await reactiveRuntime.confirm({ message: "Accept Terms & Conditions?" });
					return { formType, complexity, username, email, profile, preferences, verification, terms };
				}

				const password = await reactiveRuntime.text({ message: "Password" });
				return { formType, complexity, username, email, password };
			}

			// Default case
			const defaultField = await reactiveRuntime.text({ message: "Default Configuration" });
			return { formType, complexity, defaultField };
		}
	);

	// Regular phase flow (non-reactive) for comparison
	const phasedForm = await reactiveRuntime.group(
		{ message: "Phased Form (Traditional)", flow: "phase" },
		async () => {
			const customName = await customText({
				message: "Enter your custom name",
				placeholder: "e.g. John Doe",
				prefix: "✨",
			});
			const colors = await multi({
				message: "Select your favorite colors",
				options: ["red", "green", "blue", "yellow", "purple"],
			});
			const name = await reactiveRuntime.text({ message: "Name" });
			const email = await reactiveRuntime.text({ message: "Email" });
			return { customName, colors, name, email };
		}
	);

	// Regular static group (non-reactive) for comparison - shows all fields upfront
	const staticForm = await reactiveRuntime.group(
		{ message: "Static Form (Traditional Upfront Discovery)", flow: "static" },
		async () => {
			const role = await reactiveRuntime.text({ message: "Role (user/admin)" });
			if (role === "admin") {
				const code = await reactiveRuntime.text({ message: "Access code" });
				const email = await reactiveRuntime.text({ message: "Email" });
				return { role, code, email };
			}
			const news = await reactiveRuntime.confirm({ message: "Subscribe to newsletter?" });
			return { role, news };
		}
	);

	return {
		name,
		customName,
		prefs2,                // Reactive role-based fields
		subscriptionSetup,     // Reactive subscription features
		colors,
		dynamicForm,          // Reactive dynamic form
		phasedForm,           // Traditional phase flow
		staticForm,           // Traditional static upfront discovery
	};
};

const main = async () => {
	try {
		console.log('🚀 Reactive Discovery Example');
		console.log('=' .repeat(50));
		console.log('This example demonstrates:');
		console.log('• Progressive field revelation based on user input');
		console.log('• Multiple trigger fields for complex conditional logic');
		console.log('• Comparison with traditional upfront discovery');
		console.log('• Real-world scenarios (roles, subscriptions, dynamic forms)');
		console.log('=' .repeat(50));

		const result = await reactiveRuntime.ask(flow);

		console.log("\n📊 Final Result:");
		console.log("=" .repeat(40));
		console.log(JSON.stringify(result, null, 2));
		console.log("=" .repeat(40));

		// Show reactive discovery metrics
		const metrics = reactiveRuntime.getReactiveMetrics();
		console.log('\n📈 Reactive Discovery Metrics:');
		console.log(`   Field changes processed: ${metrics.fieldChanges}`);
		console.log(`   Errors encountered: ${metrics.errors}`);
		console.log(`   Current runtime phase: ${metrics.currentPhase}`);
		console.log(`   Discovery cache size: ${metrics.cacheSize}`);

		console.log('\n✅ Reactive discovery example completed successfully!');
		console.log('\n💡 Notice how:');
		console.log('   • Admin/moderator fields appeared only when role changed');
		console.log('   • Premium/enterprise features revealed based on subscription');
		console.log('   • Form complexity determined available options');
		console.log('   • All with the same simple group syntax as before!');

	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
};

// Run the example if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
	main().catch(console.error);
}

export { flow, main };