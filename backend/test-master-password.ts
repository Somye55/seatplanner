/**
 * Test script for Master Password Reset functionality
 *
 * This script demonstrates how to use the master password feature
 * to reset a user's password.
 *
 * Usage:
 *   npx ts-node test-master-password.ts
 */

import axios from "axios";

declare const process: {
  env: {
    API_URL?: string;
    MASTER_PASSWORD?: string;
  };
  exit: (code: number) => never;
};

const API_BASE_URL = process.env.API_URL || "http://localhost:3001";
const MASTER_PASSWORD =
  process.env.MASTER_PASSWORD || "SuperSecure@MasterPass2024";

async function testMasterPasswordReset() {
  try {
    console.log("🔐 Testing Master Password Reset Feature\n");

    // Step 1: Login as admin
    console.log("Step 1: Logging in as admin...");
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: "admin@example.com",
      password: "admin123",
      role: "Admin",
    });

    const adminToken = loginResponse.data.token;
    console.log("✅ Admin login successful\n");

    // Step 2: Reset a user's password
    console.log("Step 2: Resetting user password...");
    const resetResponse = await axios.post(
      `${API_BASE_URL}/api/auth/reset-password`,
      {
        userEmail: "student@example.com",
        newPassword: "newSecurePassword123",
        masterPassword: MASTER_PASSWORD,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Password reset successful!");
    console.log(`   Message: ${resetResponse.data.message}`);
    console.log(`   Email: ${resetResponse.data.email}\n`);

    // Step 3: Verify the new password works
    console.log("Step 3: Verifying new password...");
    const verifyResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: "student@example.com",
      password: "newSecurePassword123",
      role: "Student",
    });

    console.log("✅ New password verified successfully!");
    console.log(`   User: ${verifyResponse.data.user.email}`);
    console.log(`   Role: ${verifyResponse.data.user.role}\n`);

    console.log(
      "🎉 All tests passed! Master password feature is working correctly."
    );
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testMasterPasswordReset();
