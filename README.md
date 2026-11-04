# AquaSense Mini-Build

Tank level dashboard (Part A) and device API test suite (Part B) for the Nivoryx Systems assignment.

**Live demo:** https://aquasense-mini-build.vercel.app/

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
cd aquasense-mini-build-task
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
tests/                    Part A unit tests
api-tests/                Part B: typed API client, zod schemas, Jest tests (mocked)
docs/TEST_PLAN.md         Part B test plan
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

## Part B: API Testing

- **Test plan:** [docs/TEST_PLAN.md](docs/TEST_PLAN.md): 10 cases covering positive, negative and edge conditions (invalid token, unknown device, stale `last_seen`, malformed responses, server/network failure).
- **Automation:** Jest, in `api-tests/`. All 10 cases are automated against mocked responses (no network). A small typed client (`device-client.ts`) wraps `POST /login` and `GET /device/{id}/status`; `fetch` is injected so tests can stub responses. The client validates responses with zod, maps HTTP outcomes to typed errors, and derives an `isStale` flag from `last_seen`.
- **Run:** `npm test` (runs Part A and Part B tests).

### Mobile app behaviour when the device loses Wi-Fi mid-operation

I would test this on a controlled rig rather than a production device: a real or simulated device (for example an ESP32 or a mock device service) behind an access point or proxy I control, with the app on a real phone or emulator, so I can cut connectivity at an exact moment. I would start a command in flight, such as switching the pump on, and inject faults at different points: dropping the link before the request reaches the device, after the device executes it but before the acknowledgement returns, repeated flapping, and high latency or packet loss using a network conditioner or fault-injecting proxy. For each case I would assert that the app times out within a defined limit and shows a clear "device offline / command not confirmed" state rather than a false success or an endless spinner; that any optimistic UI state is rolled back or marked pending; that retries use backoff and are idempotent, so reconnecting never switches the pump twice; that on reconnect the app reconciles with the device's real state and labels stale data using `last_seen`; and that behaviour is correct when the phone, not the device, loses connectivity, or when the app is backgrounded or killed mid-command. I would check logs on both the app and device side to confirm what was actually received and executed.