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
  ContactInput,
} from "../types";

type ActionResult<T> =
  { success: true; data: T } | { success: false; error: string };

const applicationInclude = { contacts: { orderBy: { createdAt: "asc" as const } } };

export async function getApplications(
  status?: ApplicationStatus,
): Promise<ActionResult<Application[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };
    const applications = await prisma.application.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ appliedAt: "desc" }, { createdAt: "desc" }],
      include: applicationInclude,
    });
    return { success: true, data: applications as Application[] };
  } catch {
    return {
      success: false,
      error:
        "We couldn't load your applications. Check the database connection and try again.",
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
      include: applicationInclude,
    });
    return application
      ? { success: true, data: application as Application }
      : { success: false, error: "Not found" };
  } catch {
    return {
      success: false,
      error: "We couldn't load this application. Please try again.",
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
    const { contacts, ...appData } = validated.data;
    const application = await prisma.application.create({
      data: {
        ...appData,
        userId,
        contacts:
          contacts && contacts.length > 0
            ? {
                create: contacts.map((c) => ({
                  name: c.name,
                  role: c.role,
                  email: c.email ?? null,
                  linkedinUrl: c.linkedinUrl ?? null,
                  lastContactedAt: c.lastContactedAt
                    ? new Date(c.lastContactedAt)
                    : null,
                })),
              }
            : undefined,
      },
      include: applicationInclude,
    });
    revalidatePath("/");
    return { success: true, data: application as Application };
  } catch {
    return {
      success: false,
      error:
        "We couldn't save this application. Your entries are still here; please try again.",
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
      include: applicationInclude,
    });
    if (!existing)
      return {
        success: false,
        error: "This application is no longer available.",
      };
    const validated = validateApplication({ ...existing, ...input });
    if (!validated.success) return validated;
    const { contacts, ...appData } = validated.data;

    let contactsUpdate:
      | {
          deleteMany?: { id: { in: string[] } };
          update?: {
            where: { id: string };
            data: {
              name: string;
              role: ContactInput["role"];
              email: string | null;
              linkedinUrl: string | null;
              lastContactedAt: Date | null;
            };
          }[];
          create?: {
            name: string;
            role: ContactInput["role"];
            email: string | null;
            linkedinUrl: string | null;
            lastContactedAt: Date | null;
          }[];
        }
      | undefined = undefined;

    if (input.contacts !== undefined) {
      const contactInputs: ContactInput[] = contacts ?? [];
      const existingContactIds = (existing.contacts ?? []).map((c) => c.id);
      const toKeep = contactInputs.filter(
        (c) => c.id && existingContactIds.includes(c.id),
      );
      const toCreate = contactInputs.filter(
        (c) => !c.id || !existingContactIds.includes(c.id),
      );
      const incomingIds = toKeep.map((c) => c.id as string);
      const toDelete = existingContactIds.filter(
        (id) => !incomingIds.includes(id),
      );

      contactsUpdate = {
        deleteMany: toDelete.length > 0 ? { id: { in: toDelete } } : undefined,
        update: toKeep.map((c) => ({
          where: { id: c.id as string },
          data: {
            name: c.name,
            role: c.role,
            email: c.email ?? null,
            linkedinUrl: c.linkedinUrl ?? null,
            lastContactedAt: c.lastContactedAt
              ? new Date(c.lastContactedAt)
              : null,
          },
        })),
        create: toCreate.map((c) => ({
          name: c.name,
          role: c.role,
          email: c.email ?? null,
          linkedinUrl: c.linkedinUrl ?? null,
          lastContactedAt: c.lastContactedAt
            ? new Date(c.lastContactedAt)
            : null,
        })),
      };
    }

    const application = await prisma.application.update({
      where: { id: input.id, userId },
      data: {
        ...appData,
        ...(contactsUpdate ? { contacts: contactsUpdate } : {}),
      },
      include: applicationInclude,
    });
    revalidatePath("/");
    revalidatePath("/applications/[id]", "page");
    return { success: true, data: application as Application };
  } catch {
    return {
      success: false,
      error:
        "We couldn't update this application. Your changes are still here; please try again.",
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
      error: "We couldn't delete this application. Please try again.",
    };
  }
}
