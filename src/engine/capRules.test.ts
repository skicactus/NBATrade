import { describe, expect, it } from "vitest";
import { checkSalaryMatch, getApronStatus, maxIncomingSalary } from "./capRules";
import { FIRST_APRON, SECOND_APRON } from "./constants";

describe("getApronStatus", () => {
  it("classifies a team below the first apron", () => {
    expect(getApronStatus(150_000_000)).toBe("below_first_apron");
  });

  it("classifies a team between the first and second apron", () => {
    expect(getApronStatus(FIRST_APRON + 1)).toBe("over_first_apron");
  });

  it("classifies a team above the second apron", () => {
    expect(getApronStatus(SECOND_APRON + 1)).toBe("over_second_apron");
  });
});

describe("maxIncomingSalary", () => {
  it("allows up to 200% + 250k for small outgoing salaries below the first apron", () => {
    expect(maxIncomingSalary(5_000_000, "below_first_apron")).toBeCloseTo(10_250_000);
  });

  it("allows outgoing + 7.5M for mid-range outgoing salaries", () => {
    expect(maxIncomingSalary(20_000_000, "below_first_apron")).toBeCloseTo(27_500_000);
  });

  it("allows 125% + 250k for large outgoing salaries", () => {
    expect(maxIncomingSalary(40_000_000, "below_first_apron")).toBeCloseTo(50_250_000);
  });

  it("is stricter for teams over the first apron", () => {
    expect(maxIncomingSalary(20_000_000, "over_first_apron")).toBeCloseTo(22_250_000);
  });

  it("caps at 100% for teams over the second apron", () => {
    expect(maxIncomingSalary(20_000_000, "over_second_apron")).toBe(20_000_000);
  });
});

describe("checkSalaryMatch", () => {
  it("marks a trade legal when incoming salary is within the allowed band", () => {
    const result = checkSalaryMatch(150_000_000, 10_000_000, 15_000_000);
    expect(result.legal).toBe(true);
  });

  it("marks a trade illegal when incoming salary exceeds the allowed band", () => {
    const result = checkSalaryMatch(150_000_000, 5_000_000, 20_000_000);
    expect(result.legal).toBe(false);
  });

  it("is much stricter once a team is over the second apron", () => {
    const result = checkSalaryMatch(SECOND_APRON + 1, 5_000_000, 6_000_000);
    expect(result.legal).toBe(false);
  });
});
