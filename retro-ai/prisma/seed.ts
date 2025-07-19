import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default templates
  const templates = [
    {
      name: "Start/Stop/Continue",
      description: "Classic retrospective format to identify what to start doing, stop doing, and continue doing",
      columns: [
        { title: "Start", order: 0, color: "#10B981" },
        { title: "Stop", order: 1, color: "#EF4444" },
        { title: "Continue", order: 2, color: "#3B82F6" },
      ],
      isDefault: true,
    },
    {
      name: "Mad/Sad/Glad",
      description: "Emotional retrospective to express feelings about the sprint",
      columns: [
        { title: "Mad", order: 0, color: "#EF4444" },
        { title: "Sad", order: 1, color: "#F59E0B" },
        { title: "Glad", order: 2, color: "#10B981" },
      ],
      isDefault: true,
    },
    {
      name: "4Ls",
      description: "Reflect on what you Liked, Learned, Lacked, and Longed For",
      columns: [
        { title: "Liked", order: 0, color: "#10B981" },
        { title: "Learned", order: 1, color: "#3B82F6" },
        { title: "Lacked", order: 2, color: "#F59E0B" },
        { title: "Longed For", order: 3, color: "#8B5CF6" },
      ],
      isDefault: true,
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { name: template.name },
      update: {},
      create: {
        name: template.name,
        description: template.description,
        columns: template.columns,
        isDefault: template.isDefault,
      },
    });
  }

  console.log("Seed data created successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });