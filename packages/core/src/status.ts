import type { VideoStatus } from "./enums";

const TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  draft: ["researching", "cancelled"],
  researching: ["scripting", "failed", "cancelled"],
  scripting: ["script_review", "generating", "failed", "cancelled"],
  script_review: ["scripting", "generating", "rejected", "cancelled"],
  generating: ["rendering", "failed", "cancelled"],
  rendering: ["final_review", "approved", "failed", "cancelled"],
  final_review: ["generating", "rendering", "approved", "rejected", "cancelled"],
  approved: ["scheduled", "published", "final_review"],
  scheduled: ["published", "approved", "failed"],
  published: [],
  rejected: [],
  failed: ["researching", "scripting", "generating", "rendering", "cancelled"],
  cancelled: [],
};

export function canTransition(from: VideoStatus, to: VideoStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: VideoStatus, to: VideoStatus) {
    super(`Video cannot move from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: VideoStatus, to: VideoStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export function isTerminal(status: VideoStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
