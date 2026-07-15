import { prisma } from "@/lib/db";

// Serves uploaded images stored in the database.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(media.data), {
    headers: {
      "Content-Type": media.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
