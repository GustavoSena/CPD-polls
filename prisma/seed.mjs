// Test data for preview deployments and local development. Safe to run
// many times: it only adds what is missing. Never runs in production.
//
// Preview databases start as a copy of production, so real members are
// there too. This adds test members whose emails are "+teste" variants of
// the first ADMIN_EMAILS address (Gmail delivers them to the same inbox),
// so one person can sign in as several members. It also adds a test
// proposal and, if no Secret Santa is running, a test Secret Santa.
//
// Run locally with: npm run db:seed

import { PrismaClient } from "@prisma/client";

if (process.env.VERCEL_ENV === "production") {
  console.error("[seed] Refusing to seed the production database.");
  process.exit(1);
}

const prisma = new PrismaClient();

const adminEmail = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .find(Boolean);

function testEmail(n) {
  if (!adminEmail) return `teste${n}@example.invalid`;
  const [local, domain] = adminEmail.split("@");
  return `${local.split("+")[0]}+teste${n}@${domain}`;
}

const TEST_MEMBERS = ["Ana Teste", "Bruno Teste", "Carla Teste", "Duarte Teste"];
const PROPOSAL_TITLE = "[Teste] Que petisco levamos ao próximo jantar?";
const SANTA_NAME = "[Teste] Amigo secreto";

async function main() {
  const members = [];

  if (adminEmail) {
    members.push(
      await prisma.member.upsert({
        where: { email: adminEmail },
        update: {},
        create: { email: adminEmail, name: adminEmail.split("@")[0] },
      })
    );
  }

  for (const [i, name] of TEST_MEMBERS.entries()) {
    members.push(
      await prisma.member.upsert({
        where: { email: testEmail(i + 1) },
        update: {},
        create: { email: testEmail(i + 1), name },
      })
    );
  }

  if (!(await prisma.proposal.findFirst({ where: { title: PROPOSAL_TITLE } }))) {
    await prisma.proposal.create({
      data: {
        title: PROPOSAL_TITLE,
        description: "Proposta de teste criada automaticamente na pré-visualização.",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        options: {
          create: [
            { text: "Pastéis de bacalhau" },
            { text: "Queijo da serra" },
            { text: "Bolo de chocolate" },
          ],
        },
      },
    });
  }

  const active = await prisma.secretSantaEvent.findFirst({ where: { active: true } });
  if (!active) {
    await prisma.secretSantaEvent.create({
      data: {
        name: SANTA_NAME,
        details: "Evento de teste. Orçamento: 15 €.",
        participants: {
          create: members.map((m) => ({ memberId: m.id })),
        },
      },
    });
  }

  console.log(
    adminEmail
      ? `[seed] Test members ready: sign in at /entrar with the first ADMIN_EMAILS address plus "+teste1" to "+teste4" before the @.`
      : `[seed] Test members ready: teste1@example.invalid to teste4@example.invalid (ADMIN_EMAILS is empty).`
  );
  console.log(
    active
      ? `[seed] A Secret Santa is already active ("${active.name}"), so no test one was added.`
      : `[seed] Added "${SANTA_NAME}" with ${members.length} participants.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
