/**
 * Trigger and watch "DB integration (rollout)" on GitHub Actions.
 * Requires GH_TOKEN in env (repo scope: actions:read, actions:write for dispatch).
 * Do not commit tokens. Prefer .env: GH_TOKEN=...
 */
const token = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
const repo = process.env.GITHUB_REPOSITORY?.trim() || "Ddenbror97/pvp-arena";
const ref = process.env.GITHUB_REF_NAME?.trim() || "wallet-hardening-phase2";
const workflowFile = "db-integration-rollout.yml";

if (!token) {
  console.error("GH_TOKEN (or GITHUB_TOKEN) is required. Add to .env — do not paste in chat.");
  process.exit(1);
}

const api = (path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

async function main() {
  const wfRes = await api(`/repos/${repo}/actions/workflows/${workflowFile}`);
  if (!wfRes.ok) {
    console.error("workflow lookup failed", wfRes.status, await wfRes.text());
    process.exit(1);
  }
  const wf = await wfRes.json();

  const dispatch = await api(`/repos/${repo}/actions/workflows/${wf.id}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref }),
  });
  if (dispatch.status !== 204) {
    console.error("dispatch failed", dispatch.status, await dispatch.text());
    process.exit(1);
  }
  console.log("dispatched", workflowFile, "on", ref);

  await new Promise((r) => setTimeout(r, 8000));

  let runId = null;
  for (let i = 0; i < 30 && !runId; i++) {
    const list = await api(`/repos/${repo}/actions/workflows/${wf.id}/runs?branch=${encodeURIComponent(ref)}&per_page=5`);
    const data = await list.json();
    runId = data.workflow_runs?.[0]?.id ?? null;
    if (!runId) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!runId) {
    console.error("could not find workflow run after dispatch");
    process.exit(1);
  }

  console.log("run", runId, `https://github.com/${repo}/actions/runs/${runId}`);

  for (;;) {
    const runRes = await api(`/repos/${repo}/actions/runs/${runId}`);
    const run = await runRes.json();
    console.log("status", run.status, "conclusion", run.conclusion ?? "—");
    if (run.status === "completed") {
      const jobsRes = await api(`/repos/${repo}/actions/runs/${runId}/jobs?per_page=20`);
      const jobs = await jobsRes.json();
      for (const job of jobs.jobs ?? []) {
        console.log("job", job.name, job.conclusion);
        if (job.conclusion === "failure") {
          const logRes = await api(`/repos/${repo}/actions/jobs/${job.id}/logs`);
          const text = logRes.ok ? await logRes.text() : "(log unavailable)";
          const redacted = text
            .replace(/postgresql:\/\/[^\s]+/gi, "postgresql://***")
            .replace(/Bearer [^\s]+/gi, "Bearer ***")
            .replace(/ghp_[A-Za-z0-9]+/g, "ghp_***");
          console.log("--- log tail", job.name, "---");
          console.log(redacted.slice(-12000));
        }
      }
      process.exit(run.conclusion === "success" ? 0 : 1);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
