# AI Life Simulator MVP

This project is a multi-world AI life simulator. The current playable MVP supports:

- Cultivation World
- Cthulhu Life World
- Post-Apocalyptic Wasteland
- DeepSeek or generic OpenAI-compatible AI providers
- Offline mock mode for deterministic development
- Character setup, 20-point attributes, draw 5 talents / keep 3
- Growth Ledger attribute authority: potential, realized/current effective value, locked potential, maturity cap, and exposure
- Capability packages and developmental-expression limits so children do not receive adult power just because they have mythic potential
- 3 AI-generated choices plus a separate optional free-form action
- Event-Sourced Life Runtime: accepted changes become append-only DomainEvents, and the current `run` is a replayable projection instead of the save authority
- Selector Graph panel views: the browser receives `panelViews.main`, `panelViews.attributes`, and `panelViews.story` derived from the authoritative run instead of recomputing panels from raw internals
- State-first story continuity: structured facts/thread stages are authoritative, while AI only renders prose inside the next-event contract
- Five-axis lightweight world simulation: life pressure, talent manifestation, NPC relationships, world opportunity, and choice consequence are tracked as structured `storyState.axes`
- Annual Year Tick director: every cross-year branch gets an engine-owned yearly life delta; repeated yearly shapes are blocked across family, education, social, institution, resource, health, relationship, route, and world-pressure domains
- Persistent important NPCs, local saves, endings, and scoring

## Quick Start

Run the browser playtest:

```bash
npm run web
```

Then open:

```text
http://127.0.0.1:5181
```

If port `5181` is unavailable on your system, the server prints the fallback URL it selected. Do not use port `5173` for this project because that port is reserved for `music_agent`. Do not use port `0001` either; Chromium blocks port 1 as an unsafe port.

The browser UI lets you choose a world, create a player character, allocate 20 attribute points, draw 5 talents, keep 3, start a life, choose 1/2/3, or submit a separate free-form attempted action.

Attribute bonuses from talents enter long-term potential first. The engine-owned Growth Ledger decides how much has been realized, what is currently effective at the character's age, and how much potential is still locked. The UI displays current, realized, potential, locked potential, and attention values so mythic talents can feel exciting without turning infants or children into adults.

Accepted AI, mock, GM, and system changes now pass through the event-sourced runtime: `statePatch` is converted into DomainEvents, `transitionRun()` applies reducers and invariants, saves include `run.eventLog`, and load prefers deterministic replay over trusting a stale snapshot.

Browser panel data now follows a lightweight CQRS split: reducers produce the current run projection, then Selector Graph functions build `panelViews` for the main panel, attribute panel, and story panel. Ordinary UI should render those selector views first; raw run, event-log, growth-ledger, and hidden fields remain compatibility or GM/debug data.

The web frontend never receives AI provider keys. DeepSeek/OpenAI-compatible requests go through the local Node backend.

After every choice or free-form attempted action, the web UI shows the last action resolution separately from the next life event, so the player can see how the AI and engine judged the action before continuing.

Run the offline developer CLI smoke test:

```bash
npm run play
```

The CLI opens a setup wizard. During play:

- Enter `1`, `2`, or `3` to choose an AI-generated option.
- Enter `4` to type a custom attempted action.
- Enter `q` to save and quit.

Show CLI help:

```bash
npm run play -- --help
```

The CLI is currently a developer/debug surface for engine validation, scripted smoke tests, and AI provider checks.

## Real AI Mode

Mock mode is only for development and offline testing. A real playtest should use DeepSeek or another OpenAI-compatible API.

DeepSeek:

```powershell
$env:DEEPSEEK_API_KEY="your_api_key_here"
npm run play -- --ai deepseek
```

You can also create a local `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` and fill in your key. DeepSeek settings:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

Then run:

```bash
npm run web
npm run play -- --ai deepseek
npm run smoke:ai
npm run smoke:web -- --ai deepseek
```

Shell environment variables override `.env` values. `.env` is ignored by git. Do not commit `.env` or paste real API keys into frontend files.

After configuring a real provider, run a live JSON smoke test:

```bash
npm run smoke:ai
```

Without provider environment variables, `smoke:ai` skips cleanly. Add `-- --required` when you want CI or local release checks to fail if no real provider is configured.

Optional DeepSeek settings:

```powershell
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

Generic OpenAI-compatible provider:

```powershell
$env:OPENAI_COMPATIBLE_API_KEY="your_api_key_here"
$env:OPENAI_COMPATIBLE_BASE_URL="https://your-provider.example/v1"
$env:OPENAI_COMPATIBLE_MODEL="your-model-id"
npm run play -- --ai openai-compatible
```

Or in `.env`:

```env
OPENAI_COMPATIBLE_API_KEY=your_api_key_here
OPENAI_COMPATIBLE_BASE_URL=https://your-provider.example/v1
OPENAI_COMPATIBLE_MODEL=your-model-id
```

## Save And Continue

In the web playtest, click `保存` after a run starts. The page shows the saved local JSON path and fills the `继续存档` path field. To continue later, start `npm run web`, enter that path in `继续存档`, choose the AI mode, and click `载入存档`.

Save files from before the Growth Ledger layer are migrated on load: the engine rebuilds `player.growthLedger` from legacy attribute layers, syncs current/realized/locked values back to `player.attributes`, and then runs the normal save validator.

Current saves include an event log. The JSON snapshot remains useful for debugging and compatibility, but `loadRunFromFile()` rebuilds the authoritative run from `eventLog` when present.

Save to a chosen file:

```bash
npm run play -- --save saves/linlan.json
```

Continue a saved life:

```bash
npm run play -- --load saves/linlan.json
```

## Scripted Smoke Test

```bash
npm run play -- --ai mock --setup-script "2;LinLan;female;curious;6,6,4,2,2;1,3,5" --script "1;q" --ending-age 3 --save tmp/smoke.json
```

## Validation

Run all core checks:

```bash
npm test
npm run validate:data
npm run replay:bugs
npm run test:architecture
npm run audit:content -- --strict
npm run check:playtest
npm run smoke:web
```

`check:playtest` verifies scripts, world data, content minimums, core simulator systems, open event-generation rules, README coverage, and whether real AI environment variables are set.

`smoke:web` starts the local web backend on an auto-selected temporary port, then exercises the browser playtest API end to end: load page, list worlds, preview setup, start a run, resolve a choice, resolve free-form input, save, load, and reach an ending. It also scans returned HTML/API payloads for AI key leakage patterns.

For final playtest acceptance after configuring DeepSeek or another compatible provider, require real AI configuration:

```bash
npm run check:playtest -- --require-ai
npm run check:playtest -- --live-ai-smoke
npm run smoke:ai -- --required
npm run smoke:web -- --ai deepseek
```

`--live-ai-smoke` calls the configured provider and validates a life event, an action resolution, and an ending summary. It requires network/API access and should be used for final acceptance, not every offline development run.

## Main Docs

- [Playtest Version Standard](docs/playtest-version-standard.md)
- [MVP Program Skeleton](docs/mvp-program-skeleton.md)
- [AI Output Protocol](docs/ai-output-protocol.md)
- [Content Pool Rules](docs/content-pool-rules.md)
- [Technical Standards](docs/technical-standards.md)
- [Documentation Index](docs/README.md)
