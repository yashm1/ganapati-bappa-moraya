import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("pull requests validate without running the Vercel deploy job", async () => {
  const workflow = await readFile(new URL("../.github/workflows/vercel.yml", import.meta.url), "utf8");

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /github\.event_name\s*==\s*'push'/);
  assert.match(workflow, /github\.event_name\s*==\s*'workflow_dispatch'/);
  assert.doesNotMatch(workflow, /github\.event_name\s*==\s*'pull_request'/);
});
