import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { firebaseAdminAuth } from "../src/lib/firebase/admin";

async function claimLegacyWorkspace() {
  const args = process.argv.slice(2);
  const getArgumentValue = (name: string) => args[args.indexOf(name) + 1];
  const legacyUserId = args.includes("--user-id")
    ? getArgumentValue("--user-id")
    : undefined;
  const firebaseUid = args.includes("--firebase-uid")
    ? getArgumentValue("--firebase-uid")
    : undefined;
  if (
    !legacyUserId ||
    !/^[0-9a-f-]{36}$/i.test(legacyUserId) ||
    !firebaseUid ||
    firebaseUid.startsWith("--")
  )
    throw new Error(
      "Use npm run claim:legacy -- --user-id LEGACY_USER_UUID --firebase-uid YOUR_FIREBASE_UID. Back up the database first.",
    );
  const account = await firebaseAdminAuth().getUser(firebaseUid);
  if (
    !account.emailVerified ||
    !account.providerData.some(
      (provider) => provider.providerId === "google.com",
    )
  )
    throw new Error(
      "The target must be a verified Google account in your Firebase project.",
    );
  const applicationCount = await prisma.$transaction(async (tx) => {
    const legacy = await tx.user.findUnique({ where: { id: legacyUserId } });
    if (!legacy) throw new Error("That legacy user ID was not found.");
    if (legacy.firebaseUid && legacy.firebaseUid !== firebaseUid)
      throw new Error(
        "This workspace is already linked to a different Google account.",
      );
    const target = await tx.user.findUnique({
      where: { firebaseUid },
    });
    if (target && target.id !== legacyUserId) {
      const moved = await tx.application.updateMany({
        where: { userId: legacyUserId },
        data: { userId: target.id },
      });
      await tx.user.update({
        where: { id: legacyUserId },
        data: { key: null },
      });
      return moved.count;
    }
    await tx.user.update({
      where: { id: legacyUserId },
      data: {
        firebaseUid,
        key: null,
        email: account.email,
        displayName: account.displayName || null,
      },
    });
    return tx.application.count({ where: { userId: legacyUserId } });
  });
  console.log(
    "Google account linked. Applications retained: " +
      applicationCount +
      ". No unowned records were claimed.",
  );
}
claimLegacyWorkspace()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
