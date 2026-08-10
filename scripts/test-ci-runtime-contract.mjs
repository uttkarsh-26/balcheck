import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const agentInstructions = readFileSync('AGENTS.md', 'utf8');

for (const action of ['actions/checkout', 'actions/setup-node', 'actions/upload-artifact']) {
  const escapedAction = action.replace('/', '\\/');
  const references = [...workflow.matchAll(new RegExp(`${escapedAction}@v(\\d+)`, 'g'))];

  assert.ok(references.length > 0, `${action} must remain explicitly versioned`);
  assert.ok(
    references.every((match) => match[1] === '7'),
    `${action} must use the Node 24-compatible v7 runtime`,
  );
}

assert.match(workflow, /name: Deploy to Cloudflare Worker/);
assert.doesNotMatch(workflow, /name: Deploy to Cloudflare Pages/);
assert.match(workflow, /run: npx wrangler deploy/);
assert.doesNotMatch(workflow, /cloudflare\/wrangler-action@/);

assert.match(agentInstructions, /Stack: Astro 7, TypeScript, Tailwind CSS 4, Cloudflare Workers/);
assert.match(agentInstructions, /Fresh-build baseline: 823 generated pages/);
assert.match(agentInstructions, /GitHub Actions → Cloudflare Worker/);
assert.doesNotMatch(agentInstructions, /Stack: Astro 4/);

console.log('CI action runtimes and repository documentation are current.');
