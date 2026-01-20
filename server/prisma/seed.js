import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("12345678", 10);

  await prisma.user.upsert({
    where: { email: "demo@demo.com" },
    update: {},
    create: {
      email: "demo@demo.com",
      username: "demo",
      displayName: "Demo User",
      passwordHash: pass,
      bio: "Welcome to the platform!"
    }
  });

  console.log("Seed done. Login: demo@demo.com / 12345678");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
