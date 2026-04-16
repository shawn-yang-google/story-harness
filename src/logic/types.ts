/**
 * CheckResult — The standard output of every logic checker module.
 *
 * Each checker returns an array of these, which are aggregated by
 * runAllCheckers() and converted into a HarnessResult.
 */
export interface CheckResult {
  /** Which checker produced this result, e.g. "PropositionalChecker" */
  checker: string;
  /** The specific rule violated, e.g. "contradiction", "modus_ponens_violation" */
  rule: string;
  /** "error" = hard failure, "warning" = advisory (e.g. [MASTER_PLAYWRIGHT]'s gun) */
  severity: "error" | "warning";
  /** Human-readable description of the violation */
  message: string;
  /** Proposition/event/rule ids involved as evidence */
  evidence: string[];
}
