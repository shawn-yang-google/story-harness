/**
 * Typed errors thrown by the rejection-sampling runner (R10-B).
 *
 * The runner has two distinct ways to "fail to converge", and the CLI
 * needs to distinguish them so it can give the operator an actionable
 * message:
 *
 *   1. **Generic convergence failure** — the patch loop runs out of
 *      rounds while still flagging surgical-only issues. The runner
 *      throws a plain `Error` with the existing message
 *      `"Failed to generate a valid scene after N rounds."` This case
 *      means "give it more rounds" or "lower the difficulty" — there
 *      is nothing the human MUST do to unblock generation.
 *
 *   2. **Structural-cap exhaustion** — at least one round wanted to
 *      do a structural rewrite but `structuralRewriteCount` was already
 *      at `STRUCTURAL_REWRITE_CAP`. The runner emitted
 *      `needs-human-rewrite.md` instead and continued. If subsequent
 *      rounds still flag structural issues, the CLI should point the
 *      operator at that file rather than just saying "failed".
 *      `StructuralCapReachedError` carries everything the CLI needs
 *      to print a useful, non-generic error message.
 *
 * Both error types extend `Error`, so existing `catch (e: any)` paths
 * (which we have several of in `src/cli/index.ts`) keep working
 * without explicit type checks; new catchers can `instanceof
 * StructuralCapReachedError` to format a richer message.
 */

export interface StructuralCapReachedErrorFields {
  /** Absolute or relative session-log directory (logs/generate-...). */
  sessionDir: string;
  /** Path to the `needs-human-rewrite.md` file the runner emitted. */
  needsHumanRewritePath: string;
  /** How many structural rewrites this session burned (always === cap). */
  structuralRewriteCount: number;
  /** The cap value (currently 2; surfaced for forward compatibility). */
  structuralRewriteCap: number;
  /** R8-C counter, copied through so the CLI can show the full picture. */
  premiseRejections: number;
  /** R10-A counter, copied through so the CLI can show the full picture. */
  knowledgeSourceRejections: number;
  /** Total round budget that was exhausted. */
  rounds: number;
}

/**
 * Thrown by `RejectionSamplingRunner.generateScene` when (a) at least
 * one structural-rewrite slot was used during the session, AND (b)
 * the round budget was exhausted while structural issues were still
 * flagged. The CLI should catch this distinctly and direct the user
 * to `needs-human-rewrite.md`.
 */
export class StructuralCapReachedError extends Error {
  readonly sessionDir: string;
  readonly needsHumanRewritePath: string;
  readonly structuralRewriteCount: number;
  readonly structuralRewriteCap: number;
  readonly premiseRejections: number;
  readonly knowledgeSourceRejections: number;
  readonly rounds: number;

  constructor(fields: StructuralCapReachedErrorFields) {
    // The message must surface the cap counter AND the path so even
    // log-only sinks (which only see `err.message`, not the typed
    // fields) get the operator-actionable signal.
    super(
      `Hit structural-rewrite cap ${fields.structuralRewriteCount}/${fields.structuralRewriteCap} after ${fields.rounds} rounds. ` +
        `See ${fields.needsHumanRewritePath} for the outstanding scene-level issues.`
    );
    this.name = "StructuralCapReachedError";
    this.sessionDir = fields.sessionDir;
    this.needsHumanRewritePath = fields.needsHumanRewritePath;
    this.structuralRewriteCount = fields.structuralRewriteCount;
    this.structuralRewriteCap = fields.structuralRewriteCap;
    this.premiseRejections = fields.premiseRejections;
    this.knowledgeSourceRejections = fields.knowledgeSourceRejections;
    this.rounds = fields.rounds;
  }
}
