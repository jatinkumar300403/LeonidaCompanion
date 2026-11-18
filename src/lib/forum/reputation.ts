/**
 * The SPEC §5 reputation calculator (SPEC §15 unit test). The database keeps reputation with
 * triggers (votes_apply, threads_accepted_change); these mirror the same numbers so the UI and the
 * tests agree with it.
 */
export const REPUTATION = {
  acceptedAnswer: 10,
  postUpvote: 2,
  postDownvote: -1,
  approvedClip: 5,
  publishedUserTip: 15,
} as const;

export type VoteValue = -1 | 0 | 1;

/** What one vote on a post is worth to its author. Thread votes don't change reputation. */
export function voteReputation(value: VoteValue): number {
  if (value === 1) return REPUTATION.postUpvote;
  if (value === -1) return REPUTATION.postDownvote;
  return 0;
}

/** Reputation change when a voter moves from `from` to `to` on a post (0 = no vote). */
export function voteChangeDelta(from: VoteValue, to: VoteValue): number {
  return voteReputation(to) - voteReputation(from);
}

export type ReputationTally = {
  acceptedAnswers: number;
  postUpvotes: number;
  postDownvotes: number;
  approvedClips: number;
  publishedUserTips: number;
};

/** Total reputation from a tally of events. Accepting your own answer earns nothing (database rule). */
export function reputationTotal(tally: Partial<ReputationTally>): number {
  return (
    (tally.acceptedAnswers ?? 0) * REPUTATION.acceptedAnswer +
    (tally.postUpvotes ?? 0) * REPUTATION.postUpvote +
    (tally.postDownvotes ?? 0) * REPUTATION.postDownvote +
    (tally.approvedClips ?? 0) * REPUTATION.approvedClip +
    (tally.publishedUserTips ?? 0) * REPUTATION.publishedUserTip
  );
}
