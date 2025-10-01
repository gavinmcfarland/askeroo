# 🔧 CLI Rendering Troubleshooting Guide

## 🎯 Problem Fixed

The issue where "CLI doesn't show prompts and just exits" has been resolved! The problem was in the `RecursiveGroupContainer` visibility logic - it wasn't showing the first pending prompt.

## ✅ What Was Fixed

### **Root Cause**
The `RecursiveGroupContainer` was only showing completed and active prompts, but not the **first pending prompt** that should be active initially.

### **Solution Applied**
Updated the visibility logic in `RecursiveGroupContainer.tsx` to:
1. Show active and completed prompts
2. **Show the first pending prompt** (the one that should be active next)
3. Properly handle root-level prompts (no group)

### **Code Changes**
- Enhanced prompt activation in `PromptApp.tsx` (lines 479-482)
- Fixed visibility logic in `RecursiveGroupContainer.tsx` (lines 59-86)
- Added debug utilities for troubleshooting

## 🚀 How to Test the Fix

### **1. Run Your CLI**
```bash
npm run build
npm run dev  # or however you start your CLI
```

### **2. Debug if Issues Persist**
If your CLI still doesn't show prompts, open browser console and run:

```javascript
// Check tree state
__debugTree()

// This will show:
// - Tree statistics (total nodes, active node)
// - Tree structure visualization
// - Root children details (active, completed, visited status)
```

### **3. Emergency Fallback**
If recursive rendering has issues, temporarily switch to legacy:

```javascript
// Switch to legacy rendering (for debugging)
__enableLegacyRendering()

// Switch back to recursive (default)
__enableRecursiveRendering()
```

## 🔍 Expected Debug Output

When working correctly, `__debugTree()` should show:

```
🌳 Tree debug info:
Stats: { totalNodes: 2, activeNodeId: 'your-prompt-id', maxDepth: 1 }
Tree structure:
root (group) [PENDING]
  your-prompt-id (field) [ACTIVE]

Root children: 1
Child 0: {
  id: 'your-prompt-id',
  type: 'field',
  active: true,
  completed: false,
  visited: true
}
```

## 🐛 Common Issues & Solutions

### **Issue: No prompts showing**
**Debug**: Run `__debugTree()` in console
- **If totalNodes = 1**: Prompts aren't being added to tree
- **If activeNodeId = null**: Prompt activation failed
- **If Root children = 0**: Tree structure issue

### **Issue: Prompts added but not visible**
**Debug**: Check the visibility logic
- Prompts should be marked as `active: true`
- First pending prompt should show even if not completed

### **Issue: CLI exits immediately**
**Likely causes**:
1. No prompts being registered
2. Tree structure not being built
3. Recursive rendering hiding all content

**Solution**: Use `__enableLegacyRendering()` to verify if it's a rendering issue

## 💡 Development Tips

### **1. Monitor Tree Changes**
Set `NODE_ENV=development` to see debug logs:
```
🌳 Tree updated for prompt: your-id text
🎯 Active node: your-id
🌳 Rendering tree with 2 nodes, active: your-id
```

### **2. Test Visibility Logic**
The visibility filter for root-level prompts:
```javascript
// Show completed, active, and first pending
if (child.completed || child.active) return true;

// Show first pending field
const allPreviousCompleted = siblings.slice(0, childIndex)
  .every(prev => prev.completed);
return allPreviousCompleted;
```

### **3. Verify Prompt Activation**
Each prompt should be activated in the tree:
```javascript
// This happens automatically in PromptApp.tsx
if (request.type !== "group") {
  treeManagerRef.current.navigateTo(request.id);
}
```

## 🎉 Success Indicators

Your CLI is working correctly when:
- ✅ Prompts appear and are interactive
- ✅ `__debugTree()` shows active nodes
- ✅ Tree structure reflects your prompt flow
- ✅ Navigation (back/forward) works properly

## 📞 If Issues Persist

If you're still experiencing issues:

1. **Check console output** for debug messages
2. **Run `__debugTree()`** to examine tree state
3. **Try `__enableLegacyRendering()`** to isolate the issue
4. **Verify your prompt definitions** are correct

The recursive rendering system is now the default and should handle all CLI scenarios correctly! 🌳✨