import type { JobType } from "../jobTypes";
import type { ApplicationStatus } from "../statuses";
export type { ApplicationStatus, JobType };
export interface Application {
  id: string;
  company: string;
  role: string;
  jobType: JobType;
  status: ApplicationStatus;
  salary: string | null;
  url: string | null;
  source: string | null;
  location: string | null;
  notes: string | null;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateApplicationInput {
  company: string;
  role: string;
  jobType?: JobType;
  status?: ApplicationStatus;
  salary?: string | null;
  url?: string | null;
  source?: string | null;
  location?: string | null;
  notes?: string | null;
  appliedAt: Date | string;
}
export interface UpdateApplicationInput extends Partial<CreateApplicationInput> {
  id: string;
}
