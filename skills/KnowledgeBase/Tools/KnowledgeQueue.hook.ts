#!/usr/bin/env bun
/**
 * KnowledgeQueue.hook.ts — Queue substantive sessions for vault capture
 *
 * Stop hook. Appends one checkbox entry to `{vault}/1. Inbox/Session Queue.md`
 * when the session crosses a substance threshold. Never writes notes and never
 * calls a model. Process later with the KnowledgeBase ProcessQueue workflow.
 *
 * Vault path: $KNOWLEDGEBASE_VAULT, else ~/Obsidian/Memories
 */

import { existsSync, readFileSync, statSync, appendFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join, basename } from "path";

const VAULT_PATH =
  process.env.KNOWLEDGEBASE_VAULT || join(process.env.HOME || "", "Obsidian", "Memories");
const QUEUE_PATH = join(VAULT_PATH, "1. Inbox", "Session Queue.md");

const MIN_USER_PROMPTS = 2;
const MIN_TRANSCRIPT_BYTES = 20_000;

const QUEUE_HEADER = `# Session Queue

> Auto-appended by the KnowledgeBase Stop hook when a session crosses the substance threshold.
> Process with the KnowledgeBase skill: say **"process the knowledge base queue"** — each entry becomes a note in \`3. Projects/{Project}/\`.
> Never delete entries; ProcessQueue checks them off with an outcome.

`;

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
}

async function readHookInput(): Promise<HookInput | null> {
  const decoder = new TextDecoder();
  const reader = Bun.stdin.stream().getReader();
  let input = "";
  try {
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const read = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();
    await Promise.race([read, timeout]);
    await reader.cancel().catch(() => {});
    if (!input.trim()) return null;
    return JSON.parse(input) as HookInput;
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  }
}

function extractUserPrompts(transcriptPath: string): string[] {
  const prompts: string[] = [];
  const raw = readFileSync(transcriptPath, "utf-8");
  for (const line of raw.split("\n")) {
    if (!line.includes('"type":"user"')) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type !== "user" || entry.isMeta) continue;
      const content = entry.message?.content;
      let text = "";
      if (typeof content === "string") {
        text = content;
      } else if (Array.isArray(content)) {
        if (content.some((c: { type?: string }) => c?.type === "tool_result")) continue;
        text = content
          .filter((c: { type?: string; text?: string }) => c?.type === "text")
          .map((c: { text?: string }) => c.text)
          .join(" ");
      }
      text = text.trim();
      if (!text || text.startsWith("<")) continue;
      prompts.push(text);
    } catch {
      /* skip malformed lines */
    }
  }
  return prompts;
}

function detectProject(cwd: string): { project: string; branch: string } {
  let project = basename(cwd || process.env.HOME || "unknown");
  let branch = "";
  try {
    const top = execSync("git rev-parse --show-toplevel", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (top) project = basename(top);
    branch = execSync("git branch --show-current", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    /* not a git repo */
  }
  return { project, branch };
}

function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function main() {
  const input = await readHookInput();
  if (!input?.session_id || !input.transcript_path) process.exit(0);

  if (existsSync(QUEUE_PATH) && readFileSync(QUEUE_PATH, "utf-8").includes(input.session_id)) {
    process.exit(0);
  }

  if (!existsSync(input.transcript_path)) process.exit(0);
  if (statSync(input.transcript_path).size < MIN_TRANSCRIPT_BYTES) process.exit(0);

  const prompts = extractUserPrompts(input.transcript_path);
  if (prompts.length < MIN_USER_PROMPTS) process.exit(0);

  const { project, branch } = detectProject(input.cwd || "");
  const hint = prompts[0].replace(/\s+/g, " ").slice(0, 140);
  const entry = `- [ ] ${localStamp()} · **${project}**${branch ? ` (${branch})` : ""} — "${hint}" · sid:${input.session_id} · \`${input.transcript_path}\`\n`;

  if (!existsSync(QUEUE_PATH)) writeFileSync(QUEUE_PATH, QUEUE_HEADER, "utf-8");
  appendFileSync(QUEUE_PATH, entry, "utf-8");
  process.exit(0);
}

main().catch((err) => {
  console.error("[KnowledgeQueue] Fatal:", err);
  process.exit(0);
});
