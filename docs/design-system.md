# Using the design system

RE:GOV's design system is written down as an agent skill, a folder of plain Markdown that an AI
coding assistant reads before it writes any interface code:

```
.claude/skills/regov-design-system/
  SKILL.md                 the rules that never bend, and the workflow
  references/foundations.md  colour, type, rules, spacing, motion, layout safety
  references/sites.md        site shell, page templates, the 12 block types, civic parts
  references/app.md          the regov.app pages
  references/explore.md      the Explore tourism kit
  references/copy.md         voice, disclaimers, labels
```

Every component is rendered live at [regov.app/design-system](https://regov.app/design-system).
Open it next to your assistant so you can point at what you want.

## 1. Get the skill

Inside a fork of this repo there is nothing to do: the skill is already in place.

For your own project, copy the folder in:

```bash
git clone --depth 1 https://github.com/rockyru/regov /tmp/regov
mkdir -p .claude/skills
cp -r /tmp/regov/.claude/skills/regov-design-system .claude/skills/
```

The rules point at source files in this repo. Keep the clone around, or read them on GitHub, so
the assistant can copy real class strings instead of guessing.

## 2. Use it with your assistant

**Claude Code.** Skills in `.claude/skills/` (or `~/.claude/skills/` for every project) are
picked up automatically: Claude reads this one whenever you ask for government-site UI. You can
also call it by name with `/regov-design-system`.

**Cursor, GitHub Copilot, Codex and other agents.** Point the agent's instruction file at the
skill. Add a line like this to `AGENTS.md`, `.cursor/rules/`, or `.github/copilot-instructions.md`:

```
Before writing any UI, read .claude/skills/regov-design-system/SKILL.md and the reference it
names for the page you are building. Follow its rules exactly.
```

**ChatGPT, Claude.ai or any chat assistant.** Paste or attach `SKILL.md` and the reference you
need (usually `foundations.md`, `sites.md` and `copy.md`), then ask your question.

## 3. Example prompts

- "Using the regov-design-system skill, rebuild the homepage of our municipality from
  `content.md`: hotlines first, then services, then news. Next.js and Tailwind."
- "Add a 'Pay your real property tax' service page in the RE:GOV ContentPage style. Use only the
  steps and fees in this text, and link every phone number."
- "Port the RE:GOV site header and footer to a WordPress block theme. Keep the unofficial-concept
  bar."
- "Review this page against the regov-design-system rules and list what breaks them."

## 4. Rules your assistant must keep

The skill says this too; repeat it in your prompt if your tool skips instructions.

- Label every page an **unofficial concept**, and never call it "official".
- **Invent nothing.** Names, numbers, dates, fees, hours and map pins come from the real site or
  a named open dataset, and each fact keeps its source. Label AI images as illustrations.
- Agency names, seals and content belong to their institutions. The code is
  [MIT](../LICENSE); they are not.

Built something with it? Share it in
[Discussions](https://github.com/rockyru/regov/discussions/categories/show-and-tell).
