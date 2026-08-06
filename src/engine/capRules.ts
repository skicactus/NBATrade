import { FIRST_APRON, SECOND_APRON } from "./constants";

export type ApronStatus = "below_first_apron" | "over_first_apron" | "over_second_apron";

export function getApronStatus(teamPayroll: number): ApronStatus {
  if (teamPayroll > SECOND_APRON) return "over_second_apron";
  if (teamPayroll > FIRST_APRON) return "over_first_apron";
  return "below_first_apron";
}

// Real NBA base salary-matching bands (below the first apron): incoming salary
// is capped relative to outgoing salary on a sliding scale that gets stricter
// as the outgoing amount grows. Teams over an apron face flat, tighter caps
// and (in reality) restrictions on aggregating salaries — not modeled here.
export function maxIncomingSalary(outgoingSalary: number, apron: ApronStatus): number {
  if (apron === "over_second_apron") {
    return outgoingSalary;
  }
  if (apron === "over_first_apron") {
    return outgoingSalary * 1.1 + 250_000;
  }
  if (outgoingSalary <= 7_500_000) {
    return outgoingSalary * 2 + 250_000;
  }
  if (outgoingSalary <= 29_000_000) {
    return outgoingSalary + 7_500_000;
  }
  return outgoingSalary * 1.25 + 250_000;
}

export interface CapCheckResult {
  legal: boolean;
  apron: ApronStatus;
  outgoingSalary: number;
  incomingSalary: number;
  maxIncomingSalary: number;
  reason: string;
}

export function checkSalaryMatch(
  teamPayroll: number,
  outgoingSalary: number,
  incomingSalary: number,
): CapCheckResult {
  const apron = getApronStatus(teamPayroll);
  const max = maxIncomingSalary(outgoingSalary, apron);
  const legal = incomingSalary <= max;

  return {
    legal,
    apron,
    outgoingSalary,
    incomingSalary,
    maxIncomingSalary: max,
    reason: legal
      ? `Incoming salary $${incomingSalary.toLocaleString()} is within the $${max.toLocaleString()} limit for this team's apron bracket.`
      : `Incoming salary $${incomingSalary.toLocaleString()} exceeds the $${max.toLocaleString()} limit allowed for $${outgoingSalary.toLocaleString()} outgoing (${apron.replace(/_/g, " ")}).`,
  };
}
