// AI-generated: written by an AI assistant (Copilot).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Skill {
  name: string;
  description: string;
  dir: string;
  file: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseSkill(text: string, dir: string, file: string): Skill | undefined {
  const match = FRONTMATTER.exec(text);
  if (!match) return undefined;
  const meta = Bun.YAML.parse(match[1] ?? "") as { name?: unknown; description?: unknown } | null;
  const description = typeof meta?.description === "string" ? meta.description.replace(/\s+/g, " ").trim() : "";
  if (description === "") return undefined;
  const name = typeof meta?.name === "string" && meta.name.trim() !== "" ? meta.name.trim() : dir.split("/").pop()!;
  return { name, description, dir, file };
}

/** Index every `<dir>/<skill>/SKILL.md` that has a description. Earlier dirs win on name clashes. */
export function loadSkills(dirs: string[]): Skill[] {
  const byName = new Map<string, Skill>();
  for (const root of dirs) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      const file = join(dir, "SKILL.md");
      if (!existsSync(file)) continue;
      const skill = parseSkill(readFileSync(file, "utf8"), dir, file);
      if (skill && !byName.has(skill.name)) byName.set(skill.name, skill);
    }
  }
  return [...byName.values()];
}

export function skillBody(skill: Skill): string {
  return readFileSync(skill.file, "utf8").replace(FRONTMATTER, "").trim();
}
