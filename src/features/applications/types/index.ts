import type { ApplicationStatus } from "../statuses";
export type { ApplicationStatus };
export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  salary: string | null;
  url: string | null;
  notes: string | null;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateApplicationInput {
  company: string;
  role: string;
  status?: ApplicationStatus;
  salary?: string | null;
  url?: string | null;
  notes?: string | null;
  appliedAt: Date | string;
}
export interface UpdateApplicationInput extends Partial<CreateApplicationInput> {
  id: string;
}
