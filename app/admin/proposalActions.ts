"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

// Permanently delete a proposal (e.g. a test one). Its options, votes and
// member-vote records go with it through the schema's cascades. Images are
// not linked by a foreign key, so they are removed here, unless something
// else still points at the same image.
export async function deleteProposal(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");

  await prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUnique({
      where: { id },
      select: { imageId: true, options: { select: { imageId: true } } },
    });
    if (!proposal) return;

    const imageIds = [
      proposal.imageId,
      ...proposal.options.map((o) => o.imageId),
    ].filter((m): m is string => !!m);

    await tx.proposal.delete({ where: { id } });

    if (imageIds.length > 0) {
      const [proposalsUsing, optionsUsing] = await Promise.all([
        tx.proposal.findMany({
          where: { imageId: { in: imageIds } },
          select: { imageId: true },
        }),
        tx.option.findMany({
          where: { imageId: { in: imageIds } },
          select: { imageId: true },
        }),
      ]);
      const stillUsed = new Set(
        [...proposalsUsing, ...optionsUsing].map((r) => r.imageId)
      );
      const unused = imageIds.filter((m) => !stillUsed.has(m));
      if (unused.length > 0) {
        await tx.media.deleteMany({ where: { id: { in: unused } } });
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
}
