import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { resolveApiUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { readJson, RequestError } from "@/lib/request";
import { validateApplication } from "@/features/applications/validation";

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveApiUser(request);
    if (!userId)
      return NextResponse.json(
        {
          error:
            "Your Google session expired. Sign in again in the extension’s Settings.",
        },
        { status: 401 },
      );
    const validated = validateApplication(await readJson(request));
    if (!validated.success)
      return NextResponse.json(
        { error: validated.error, fields: validated.fields },
        { status: 400 },
      );
    const application = await prisma.application.create({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: (({ contacts: _contacts, ...rest }) => ({ ...rest, userId }))(validated.data),
    });
    revalidatePath("/");
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof RequestError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      {
        error:
          "The tracker is unavailable. Please check its database connection and try again.",
      },
      { status: 503 },
    );
  }
}
