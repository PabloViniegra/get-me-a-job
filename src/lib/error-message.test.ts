import { describe, expect, it } from "vitest";
import { friendlyErrorMessage } from "./error-message";

describe("friendlyErrorMessage", () => {
  it("strips the TRPCClientError prefix", () => {
    expect(friendlyErrorMessage("TRPCClientError: something failed")).toBe(
      "something failed",
    );
  });

  it("strips a leading 'Error: ' prefix", () => {
    expect(friendlyErrorMessage("Error: nope")).toBe("nope");
  });

  it("returns the generic fallback for empty/whitespace input", () => {
    expect(friendlyErrorMessage("")).toBe(friendlyErrorMessage("   ".trim()));
  });

  it("maps network/fetch/aborted/timeout/offline errors to a friendly Spanish message", () => {
    const inputs = [
      "TRPCClientError: Network error",
      "Failed to fetch",
      "Request aborted",
      "Connection timeout",
      "You are offline",
    ];
    for (const input of inputs) {
      expect(friendlyErrorMessage(input)).toBe(
        "Sin conexión con el servidor. Comprueba tu red y vuelve a intentarlo.",
      );
    }
  });

  it("passes through unrelated messages unchanged (after prefix cleanup)", () => {
    expect(friendlyErrorMessage("TRPCClientError: Validation failed")).toBe(
      "Validation failed",
    );
  });
});
