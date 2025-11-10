import * as dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import { PrismaClient } from "./generated/prisma/client";

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!";

  try {
    // Check if super admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role === "SuperAdmin") {
        console.log("Super admin already exists with email:", email);
        return;
      } else {
        console.log("User with this email exists but is not a super admin.");
        console.log(
          "Please use a different email or delete the existing user."
        );
        return;
      }
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "SuperAdmin",
      },
    });

    console.log("✅ Super admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
  } catch (error) {
    console.error("Error creating super admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
