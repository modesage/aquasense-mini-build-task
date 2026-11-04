import {
    ApiError,
    getDeviceStatus,
    login,
    STALE_AFTER_MS,
    type ApiErrorKind,
    type FetchFn,
  } from "./device-client";
  
  const BASE = "https://api.example.test";
  const NOW = new Date("2026-11-02T20:00:00Z");
  const CREDS = { username: "operator", password: "correct-horse" };
  
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  
  const raw = (status: number, body: string) => new Response(body, { status });
  
  const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
  
  /** Stubs the network: returns `res` and records every request. */
  function stubFetch(res: Response) {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn: FetchFn = async (url, init) => {
      calls.push({ url, init });
      return res;
    };
    return { fetchFn, calls };
  }
  
  const opts = (fetchFn: FetchFn) => ({ baseUrl: BASE, fetchFn });
  const headersOf = (init?: RequestInit) => (init?.headers ?? {}) as Record<string, string>;
  
  async function expectApiError(promise: Promise<unknown>, kind: ApiErrorKind, status?: number) {
    const err = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe(kind);
    if (status !== undefined) expect((err as ApiError).status).toBe(status);
  }
  
  describe("POST /login", () => {
    it("TC-01 returns a token for valid credentials", async () => {
      const { fetchFn, calls } = stubFetch(json(200, { token: "abc.def.ghi" }));
  
      const token = await login(opts(fetchFn), CREDS);
  
      expect(token).toBe("abc.def.ghi");
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(`${BASE}/login`);
      expect(calls[0].init?.method).toBe("POST");
      expect(JSON.parse(String(calls[0].init?.body))).toEqual(CREDS);
    });
  
    it("TC-03 maps 401 to unauthorized for wrong credentials", async () => {
      const { fetchFn } = stubFetch(json(401, { error: "invalid credentials" }));
      await expectApiError(login(opts(fetchFn), CREDS), "unauthorized", 401);
    });
  
    it("TC-04 maps 400 to bad_request when fields are missing", async () => {
      const { fetchFn } = stubFetch(json(400, { error: "username and password required" }));
      await expectApiError(login(opts(fetchFn), { username: "", password: "" }), "bad_request", 400);
    });
  
    it("TC-09 rejects a 200 login response that has no token", async () => {
      const { fetchFn } = stubFetch(json(200, {}));
      await expectApiError(login(opts(fetchFn), CREDS), "malformed_response");
    });
  });
  
  describe("GET /device/{id}/status", () => {
    it("TC-02 returns a valid, fresh status", async () => {
      const lastSeen = minutesAgo(1);
      const { fetchFn, calls } = stubFetch(
        json(200, { level_percent: 55, pump_state: "off", last_seen: lastSeen }),
      );
  
      const status = await getDeviceStatus(opts(fetchFn), "DEV_101", "valid-token", NOW);
  
      expect(status).toEqual({
        level_percent: 55,
        pump_state: "off",
        last_seen: lastSeen,
        isStale: false,
      });
      expect(calls[0].url).toBe(`${BASE}/device/DEV_101/status`);
      expect(calls[0].init?.method).toBe("GET");
      expect(headersOf(calls[0].init).Authorization).toBe("Bearer valid-token");
    });
  
    it("TC-05 sends no Authorization header without a token and maps 401", async () => {
      const { fetchFn, calls } = stubFetch(json(401, { error: "missing token" }));
  
      await expectApiError(getDeviceStatus(opts(fetchFn), "DEV_101", "", NOW), "unauthorized", 401);
      expect(headersOf(calls[0].init).Authorization).toBeUndefined();
    });
  
    it("TC-06 maps 401 to unauthorized for an invalid or expired token", async () => {
      const { fetchFn, calls } = stubFetch(json(401, { error: "invalid token" }));
  
      await expectApiError(
        getDeviceStatus(opts(fetchFn), "DEV_101", "expired-token", NOW),
        "unauthorized",
        401,
      );
      expect(headersOf(calls[0].init).Authorization).toBe("Bearer expired-token");
    });
  
    it("TC-07 maps 404 to not_found for an unknown device", async () => {
      const { fetchFn, calls } = stubFetch(json(404, { error: "device not found" }));
  
      await expectApiError(
        getDeviceStatus(opts(fetchFn), "INVALID_999", "valid-token", NOW),
        "not_found",
        404,
      );
      expect(calls[0].url).toBe(`${BASE}/device/INVALID_999/status`);
    });
  
    it("TC-08 flags a device as stale when last_seen is older than 15 minutes", async () => {
      const { fetchFn } = stubFetch(
        json(200, { level_percent: 40, pump_state: "on", last_seen: minutesAgo(16) }),
      );
  
      const status = await getDeviceStatus(opts(fetchFn), "DEV_102", "valid-token", NOW);
  
      expect(status.isStale).toBe(true);
      expect(status.pump_state).toBe("on");
    });
  
    it("TC-08 does not flag a device stale at exactly 15 minutes (strict threshold)", async () => {
      const lastSeen = new Date(NOW.getTime() - STALE_AFTER_MS).toISOString();
      const { fetchFn } = stubFetch(
        json(200, { level_percent: 40, pump_state: "on", last_seen: lastSeen }),
      );
  
      const status = await getDeviceStatus(opts(fetchFn), "DEV_102", "valid-token", NOW);
  
      expect(status.isStale).toBe(false);
    });
  
    describe("TC-09 malformed responses are rejected without crashing", () => {
      const valid = { level_percent: 55, pump_state: "off", last_seen: minutesAgo(1) };
  
      const cases: Array<[string, () => Response]> = [
        ["body is not JSON", () => raw(200, "{oops")],
        ["empty body", () => raw(200, "")],
        ["missing last_seen", () => json(200, { level_percent: 55, pump_state: "off" })],
        ["pump_state not in on/off", () => json(200, { ...valid, pump_state: "maybe" })],
        ["level_percent above 100", () => json(200, { ...valid, level_percent: 140 })],
        ["level_percent is a string", () => json(200, { ...valid, level_percent: "55" })],
        ["last_seen is not a timestamp", () => json(200, { ...valid, last_seen: "not-a-date" })],
      ];
  
      for (const [label, makeResponse] of cases) {
        it(label, async () => {
          const { fetchFn } = stubFetch(makeResponse());
          await expectApiError(
            getDeviceStatus(opts(fetchFn), "DEV_101", "valid-token", NOW),
            "malformed_response",
          );
        });
      }
    });
  
    it("TC-10 maps a 503 to a server_error", async () => {
      const { fetchFn } = stubFetch(json(503, { error: "unavailable" }));
      await expectApiError(
        getDeviceStatus(opts(fetchFn), "DEV_101", "valid-token", NOW),
        "server_error",
        503,
      );
    });
  
    it("TC-10 maps a network failure to network_error", async () => {
      const fetchFn: FetchFn = async () => {
        throw new TypeError("fetch failed");
      };
      await expectApiError(
        getDeviceStatus(opts(fetchFn), "DEV_101", "valid-token", NOW),
        "network_error",
      );
    });
  });