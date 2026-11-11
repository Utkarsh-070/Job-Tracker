import type { JobType } from "../jobTypes";
import type { ApplicationStatus } from "../statuses";
export type { ApplicationStatus, JobType };

export type ContactRole = "RECRUITER" | "HIRING_MANAGER" | "REFERRER" | "OTHER";

export interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  email: string | null;
  linkedinUrl: string | null;
  lastContactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  applicationId: string;
}

export interface ContactInput {
  id?: string;
  name: string;
  role: ContactRole;
  email?: string | null;
  linkedinUrl?: string | null;
  lastContactedAt?: string | null;
}

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
  interviewDate: Date | null;
  interviewers: string | null;
  meetingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  contacts: Contact[];
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
  interviewDate?: string | null;
  interviewers?: string | null;
  meetingUrl?: string | null;
  contacts?: ContactInput[];
}
export interface UpdateApplicationInput extends Partial<CreateApplicationInput> {
  id: string;
}
