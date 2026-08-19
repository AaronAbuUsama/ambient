/** `failure` through its interface. */

import { expect, it } from "vite-plus/test";

import { causeOf, isMissing } from "./service.ts";

it("a Cause is the Error's message, and anything else is still printed", () => {
  expect(causeOf(new Error("EACCES: permission denied"))).toBe("EACCES: permission denied");

  // A value that is not an Error can still be raised. Printing it beats reporting
  // nothing, which is what `home` did before ADR 001 amendment 5.
  expect(causeOf("just a string")).toBe("just a string");
  expect(causeOf(undefined)).toBe("undefined");
  expect(causeOf({ nested: true })).toBe("[object Object]");
});

it("only an ENOENT is missing — every other code is a problem", () => {
  const missing = Object.assign(new Error("no such file"), { code: "ENOENT" });
  const refused = Object.assign(new Error("permission denied"), { code: "EACCES" });

  expect(isMissing(missing)).toBe(true);
  expect(isMissing(refused)).toBe(false);
});

it("an error with no code, and a value that is not an error, are not missing", () => {
  // The distinction that matters: absent is a state, unreadable is a problem, and
  // anything we cannot identify must not be read as absent.
  expect(isMissing(new Error("no code at all"))).toBe(false);
  expect(isMissing("ENOENT")).toBe(false);
  expect(isMissing(undefined)).toBe(false);
  expect(isMissing({ code: "ENOENT" })).toBe(false);
});
