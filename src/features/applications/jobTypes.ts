export const JOB_TYPES = ["INTERN", "FULL_TIME"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  INTERN: "Intern",
  FULL_TIME: "Full Time",
};
