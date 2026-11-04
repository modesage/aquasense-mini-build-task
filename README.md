# AquaSense Mini-Build

Tank level dashboard (Part A) and device API test suite (Part B) for the Nivoryx Systems assignment.

**Live demo:** 

## Part A: Tank Level Dashboard

A single-page dashboard built from the provided mock readings. It shows:

- Current tank level
- Today's minimum and maximum (with the time each occurred)
- A low-water alert when the level is below 20%
- A level-over-time chart with the 20% threshold line and breach points marked

### Tech stack

Next.js (App Router), TypeScript, Tailwind CSS, Recharts, Jest.

### Run locally

Requires Node.js 20.9 or newer.

```bash
git clone https://github.com/modesage/aquasense-mini-build-task.git
cd aquasense-mini-build
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests
npm run build    # production build
```

### Project structure

```
src/
  app/page.tsx            dashboard page (server component)
  components/             MetricCard, AlertBanner, LevelChart
  lib/tank-stats.ts       pure logic: current, min, max, breaches
  lib/config.ts           alert threshold (20)
  lib/format.ts           date formatting
  data/readings.json      provided mock data
tests/tank-stats.test.ts  unit tests for the logic
```

### Design decisions

- **"Today" is the date of the latest reading, not the system clock.** The mock data is dated 2026-11-02, so using the real clock would produce an empty day.
- **Alert rule is strict:** `level_percent < 20`**.** Exactly 20% does not alert.
- **Two alert states.** The latest reading is 55%, so there is no active low-water condition, but the level did drop to 18% at 16:00. The dashboard shows a red alert when the current level is below 20%, and an amber "dropped below 20% earlier today" notice when it was below 20% earlier in the day and has since recovered.
- **Pure, non-mutating logic.** `computeTankStats` copies and sorts its input, so it is order-independent and never mutates the caller's data. All the logic lives in one framework-free function that is unit tested.
- **Timestamps are treated as naive local times.** They have no timezone offset, so dates and times are read from the string rather than through `Date`, which avoids timezone shifts.
- **No backend.** The data is static JSON, so the page computes stats at render time.
- **Accessible alerts.** Alerts use `role="alert"` / `role="status"` and text, not color alone.

### Assumptions

- The tank has no ID or connectivity field in the data, so none is displayed.
- Readings are percentages in the range 0-100.

### AI tool usage note

- **Tool:** Gemini + Claude
- **Prompt 1:** Walk me through the architecture and tech you would want to use with the advantages and drawbacks for the given task. Appraoch it like an enginner who would want to balance out the **production-grade quality** (clean architecture, clean code, documentation) with **pragmatic execution**. Ask for things u want to confirm before proceeding with the task. I want to review and take the final decisions.
- **Prompt 2:** Create me a readme for the project in markdown format.
- **What it got wrong and how I fixed it:** The AI had not provided the types for jest. I got to know as i was reviewing the tank-stats.test.ts file. I fixed it by updating the tsconfig.json file with the types key inside the compiler options.
