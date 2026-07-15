"use server";

import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { isClosed } from "@/lib/status";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FormState = { error: string } | null;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function imageError(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Formato de imagem não suportado (usa JPG, PNG, WebP ou GIF).";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Cada imagem pode ter no máximo 4 MB.";
  }
  return null;
}

async function saveImage(file: File): Promise<string> {
  const media = await prisma.media.create({
    data: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()) },
  });
  return media.id;
}

// Residents submit proposals. No author is ever stored — anonymous by design.
export async function createProposal(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  if (code !== process.env.RESIDENT_CODE) {
    return { error: "Código de residente incorreto." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "A proposta precisa de um título." };

  const description = String(formData.get("description") ?? "").trim();

  // Options arrive as parallel arrays: one entry per option row in the form.
  const optionTitles = formData.getAll("optionTitle").map((v) => String(v));
  const optionDescriptions = formData
    .getAll("optionDescription")
    .map((v) => String(v));
  const optionImages = formData.getAll("optionImage");

  const options: { text: string; description: string; image: File | null }[] =
    [];
  for (let i = 0; i < optionTitles.length; i++) {
    const text = optionTitles[i].trim();
    const optDescription = (optionDescriptions[i] ?? "").trim();
    const image = isUpload(optionImages[i]) ? (optionImages[i] as File) : null;
    if (!text) {
      if (optDescription || image) {
        return { error: `A opção ${i + 1} precisa de um título.` };
      }
      continue; // fully empty row — ignore it
    }
    options.push({ text, description: optDescription, image });
  }
  if (options.length < 2) {
    return { error: "Indica pelo menos 2 opções." };
  }

  const durationHours = Number(formData.get("durationHours"));
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return { error: "Duração inválida." };
  }

  // Validate every image before writing anything to the database.
  const proposalImageEntry = formData.get("proposalImage");
  const proposalImage = isUpload(proposalImageEntry)
    ? proposalImageEntry
    : null;
  for (const file of [proposalImage, ...options.map((o) => o.image)]) {
    if (file) {
      const error = imageError(file);
      if (error) return { error };
    }
  }

  const proposal = await prisma.proposal.create({
    data: {
      title,
      description,
      imageId: proposalImage ? await saveImage(proposalImage) : null,
      deadline: new Date(Date.now() + durationHours * 60 * 60 * 1000),
      options: {
        create: await Promise.all(
          options.map(async (o) => ({
            text: o.text,
            description: o.description,
            imageId: o.image ? await saveImage(o.image) : null,
          }))
        ),
      },
    },
  });

  revalidatePath("/");
  redirect(`/proposal/${proposal.id}`);
}

// Only recognized members (via their personal link) can vote, and only once
// per proposal. The registered choice (Vote) has no link to the member —
// MemberVote only records THAT they voted, for the "everyone voted" rule.
export async function castVote(formData: FormData): Promise<void> {
  const proposalId = String(formData.get("proposalId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");

  if (!optionId) {
    redirect(`/proposal/${proposalId}?erro=escolhe`);
  }

  const member = await currentMember();
  if (!member) {
    redirect(`/proposal/${proposalId}?erro=membro`);
  }

  const [proposal, memberCount] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { votes: { select: { id: true } }, options: true },
    }),
    prisma.member.count(),
  ]);
  if (!proposal) redirect("/");
  if (isClosed(proposal, memberCount)) {
    redirect(`/proposal/${proposalId}?erro=fechada`);
  }
  if (!proposal.options.some((o) => o.id === optionId)) {
    redirect(`/proposal/${proposalId}?erro=escolhe`);
  }

  try {
    await prisma.$transaction([
      prisma.memberVote.create({
        data: { memberId: member.id, proposalId },
      }),
      prisma.vote.create({ data: { proposalId, optionId } }),
    ]);
  } catch {
    // Unique constraint: this member already voted on this proposal.
    redirect(`/proposal/${proposalId}?erro=repetido`);
  }

  revalidatePath("/");
  revalidatePath(`/proposal/${proposalId}`);
  redirect(`/proposal/${proposalId}`);
}
