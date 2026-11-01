"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { validateApplication } from "../validation";
import type { ApplicationStatus } from "../statuses";
import type {
  Application,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../types";

type ActionResult<T> =
  { success: true; data: T } | { success: false; error: string };

export async function getApplications(
  status?: ApplicationStatus,
): Promise<ActionResult<Application[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const applications = await prisma.application.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ appliedAt: "desc" }, { createdAt: "desc" }],
    });
    return { success: true, data: applications };
  } catch {
    return {
      success: false,
      error:
        "We couldn’t load your applications. Check the database connection and try again.",
    };
  }
}
export async function getApplication(
  id: string,
): Promise<ActionResult<Application>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const application = await prisma.application.findUnique({
      where: { id, userId },
    });
    return application
      ? { success: true, data: application }
      : { success: false, error: "Not found" };
  } catch {
    return {
      success: false,
      error: "We couldn’t load this application. Please try again.",
    };
  }
}
export async function createApplication(
  input: CreateApplicationInput,
): Promise<ActionResult<Application>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const validated = validateApplication(input);
    if (!validated.success) return validated;
    const application = await prisma.application.create({
      data: { ...validated.data, userId },
    });
    revalidatePath("/");
    return { success: true, data: application };
  } catch {
    return {
      success: false,
      error:
        "We couldn’t save this application. Your entries are still here; please try again.",
    };
  }
}
export async function updateApplication(
  input: UpdateApplicationInput,
): Promise<ActionResult<Application>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    if (!input || typeof input.id !== "string")
      return { success: false, error: "Choose a valid application." };
    const existing = await prisma.application.findUnique({
      where: { id: input.id, userId },
    });
    if (!existing)
      return {
        success: false,
        error: "This application is no longer available.",
      };
    const validated = validateApplication({ ...existing, ...input });
    if (!validated.success) return validated;
    const application = await prisma.application.update({
      where: { id: input.id, userId },
      data: validated.data,
    });
    revalidatePath("/");
    revalidatePath("/applications/[id]", "page");
    return { success: true, data: application };
  } catch {
    return {
      success: false,
      error:
        "We couldn’t update this application. Your changes are still here; please try again.",
    };
  }
}
export async function deleteApplication(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    await prisma.application.delete({ where: { id, userId } });
    revalidatePath("/");
    return { success: true, data: { id } };
  } catch {
    return {
      success: false,
      error: "We couldn’t delete this application. Please try again.",
    };
  }
}
