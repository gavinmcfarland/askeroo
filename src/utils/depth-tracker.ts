import * as acorn from "acorn";
import * as walk from "acorn-walk";

type LocKey = `${number}:${number}`; // "line:column"
type DepthMap = Map<LocKey, number>;

// Cache per function body so we only parse once
const depthCache = new WeakMap<Function, DepthMap>();

export function parseDepthMapFromFunction(fn: Function): DepthMap {
  if (depthCache.has(fn)) return depthCache.get(fn)!;

  const src = Function.prototype.toString.call(fn);

  // Debug: show the function source being analyzed
  console.log(`🔧 Analyzing function source:`, src);

  // Handle "function (...) { ... }" and arrow functions → we want the *body* location mapping to align.
  // Acorn will give us positions; we'll also record a base offset to convert to line/col reliably.
  const ast = acorn.parse(src, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  }) as any;

  const map: DepthMap = new Map();

  // Utility: record a call at its callee position
  const recordCall = (node: any, depth: number) => {
    const l = node.loc?.start;
    if (!l) return;
    const key: LocKey = `${l.line}:${l.column}`;
    // Use max — the same call might be visited via multiple conditional wrappers
    map.set(key, Math.max(map.get(key) ?? 0, depth));
    console.log(`  📍 Recorded call at ${key} with depth ${depth} (type: ${node.type || 'unknown'})`);
  };

  // What counts as conditional regions:
  // - IfStatement.consequent/alternate
  // - ConditionalExpression.consequent/alternate
  // - LogicalExpression.right for &&, ||, ??
  // - SwitchCase.consequent[*]
  // - Loop bodies (for/for..of/for..in/while/do)
  // - catch block
  // - optional-chaining guarded args (best effort)
  // We *don't* count the test parts unless you want to (toggle below).

  function withDepth(n: any, depth: number) {
    walk.simple(n, visitors, undefined, { depth });
  }

  const visitors: walk.SimpleVisitors<any> = {
    CallExpression(node: any, state: { depth: number }) {
      // callee location marks the site; args may also be conditionally evaluated
      recordCall(node.callee, state.depth);

      // Optional call: if guarded, args are conditional
      if ((node as any).optional) {
        for (const arg of node.arguments || []) {
          withDepth(arg, state.depth + 1);
        }
      }
    },

    IfStatement(node: any, state: { depth: number }) {
      // (Optional) include test as conditional-compute:
      // withDepth(node.test, state.depth + 1);

      if (node.consequent) withDepth(node.consequent, state.depth + 1);
      if (node.alternate) withDepth(node.alternate, state.depth + 1);
    },

    ConditionalExpression(node: any, state: { depth: number }) {
      // withDepth(node.test, state.depth + 1);
      withDepth(node.consequent, state.depth + 1);
      withDepth(node.alternate, state.depth + 1);
    },

    LogicalExpression(node: any, state: { depth: number }) {
      // left always evaluates; right is conditional
      withDepth(node.left, state.depth);
      if (["&&", "||", "??"].includes(node.operator)) {
        withDepth(node.right, state.depth + 1);
      } else {
        withDepth(node.right, state.depth);
      }
    },

    SwitchStatement(node: any, state: { depth: number }) {
      for (const c of node.cases) {
        for (const cons of c.consequent || []) {
          withDepth(cons, state.depth + 1);
        }
      }
    },

    WhileStatement(n: any, s: { depth: number }) {
      // withDepth(n.test, s.depth + 1);
      withDepth(n.body, s.depth + 1);
    },
    DoWhileStatement(n: any, s: { depth: number }) {
      withDepth(n.body, s.depth + 1);
      // withDepth(n.test, s.depth + 1);
    },
    ForStatement(n: any, s: { depth: number }) {
      withDepth(n.body, s.depth + 1);
    },
    ForInStatement(n: any, s: { depth: number }) {
      withDepth(n.body, s.depth + 1);
    },
    ForOfStatement(n: any, s: { depth: number }) {
      withDepth(n.body, s.depth + 1);
    },

    TryStatement(n: any, s: { depth: number }) {
      if (n.handler?.body) withDepth(n.handler.body, s.depth + 1);
      if (n.finalizer) withDepth(n.finalizer, s.depth); // finally always runs
    },
  };

  // Kick off with depth 0
  walk.simple(ast, visitors, undefined, { depth: 0 });

  depthCache.set(fn, map);
  return map;
}

export function getCallsiteLineCol(stackSkip = 2): { line: number; column: number } | null {
  const e = new Error();
  if (!e.stack) return null;
  const lines = e.stack.split("\n");

  // Debug: show all stack frames to understand the call structure
  console.log(`📍 Stack frames:`);
  lines.forEach((line, i) => {
    console.log(`  ${i}: ${line}`);
  });

  // 0: "Error", 1: this function, 2: caller (pluginPrompts[plugin.type]), 3+: user site
  const frame = lines[stackSkip + 1] ?? lines[lines.length - 1];
  console.log(`📍 Using frame ${stackSkip + 1}:`, frame);

  // Match "...:line:column)"
  const m = /:(\d+):(\d+)\)?$/.exec(frame);
  if (!m) return null;

  return { line: Number(m[1]), column: Number(m[2]) };
}