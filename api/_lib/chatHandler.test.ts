import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { friendlyApiError } from "./chatHandler";

describe("friendlyApiError", () => {
  it("gives a clear message for an invalid API key", () => {
    const err = new Anthropic.AuthenticationError(
      401,
      { type: "authentication_error", message: "invalid x-api-key" },
      "invalid x-api-key",
      new Headers(),
    );
    expect(friendlyApiError(err).message).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("gives a clear message for rate limiting", () => {
    const err = new Anthropic.RateLimitError(
      429,
      { type: "rate_limit_error", message: "too many requests" },
      "too many requests",
      new Headers(),
    );
    expect(friendlyApiError(err).message).toMatch(/Rate limited/);
  });

  it("gives a clear message for a network failure", () => {
    const err = new Anthropic.APIConnectionError({ message: "fetch failed" });
    expect(friendlyApiError(err).message).toMatch(/reach the Anthropic API/);
  });

  it("falls back to a generic message for a plain Error", () => {
    const err = new Error("something else broke");
    expect(friendlyApiError(err).message).toBe("something else broke");
  });

  it("falls back to a generic message for a non-Error throw", () => {
    expect(friendlyApiError("a string was thrown").message).toBe("Unknown error calling the Anthropic API.");
  });
});
