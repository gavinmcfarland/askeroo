import { ask } from "./src/index.js";

async function main() {
	console.log("\n🧪 Testing TextInput with Word-Level Undo:");
	console.log("\n📝 Editing:");
	console.log("  • Type words separated by spaces");
	console.log("  • Each word becomes a separate undo point");
	console.log("  • Backspace to delete (each backspace is undoable)");
	console.log("\n✂️ Clearing:");
	console.log("  • Ctrl+U: Clear from beginning to cursor");
	console.log("  • Ctrl+K: Clear from cursor to end");
	console.log("\n⏮️  Undo/Redo (Word-Level):");
	console.log("  • Ctrl+Z (Win) / Cmd+Z (Mac): Undo last word/space");
	console.log("  • Ctrl+Y (Win) / Cmd+Shift+Z (Mac): Redo");
	console.log("\n🔀 Navigation:");
	console.log("  • Ctrl+A: Jump to start");
	console.log("  • Ctrl+E: Jump to end");
	console.log("  • ←/→: Move cursor");
	console.log("\n💡 Example:");
	console.log('  Type: "hello world foo"');
	console.log('  Undo: "hello world "');
	console.log('  Undo: "hello world"');
	console.log('  Undo: "hello "\n');

	const name = await ask.text({
		label: "Try typing words and undoing them",
		initialValue: "",
	});

	console.log(`\nYou entered: "${name}"`);
}

main();
