import React, { useState } from "react";
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
import { api } from "../services/apiService";
import { showSuccessToast, showErrorToast } from "../utils/toast";

const PasswordResetPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isMasterPasswordVisible, setIsMasterPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<{
    userEmail?: string;
    newPassword?: string;
    masterPassword?: string;
  }>({});

  const validate = () => {
    const newErrors: {
      userEmail?: string;
      newPassword?: string;
      masterPassword?: string;
    } = {};

    if (!userEmail) {
      newErrors.userEmail = "User email is required";
    } else if (!/\S+@\S+\.\S+/.test(userEmail)) {
      newErrors.userEmail = "Email is invalid";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!masterPassword) {
      newErrors.masterPassword = "Master password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await api.resetPassword({
        userEmail,
        newPassword,
        masterPassword,
      });
      showSuccessToast(
        `Password reset successfully for ${result.email}. User can now login with the new password.`
      );
      // Clear form
      setUserEmail("");
      setNewPassword("");
      setMasterPassword("");
      setErrors({});
    } catch (err: any) {
      showErrorToast(err, "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Reset User Password</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Master Password Reset</h2>
            <p className="text-sm text-default-500">
              Use the master password to reset any user's password. This should
              only be used when a user has forgotten their password.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="User Email"
              type="email"
              variant="bordered"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              isInvalid={!!errors.userEmail}
              errorMessage={errors.userEmail}
              placeholder="student@example.com"
              description="Email of the user whose password you want to reset"
              required
            />

            <Input
              label="New Password"
              type={isPasswordVisible ? "text" : "password"}
              variant="bordered"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              isInvalid={!!errors.newPassword}
              errorMessage={errors.newPassword}
              placeholder="Enter new password"
              description="Minimum 6 characters"
              required
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? (
                    <svg
                      className="w-5 h-5 text-default-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-default-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              }
            />

            <Input
              label="Master Password"
              type={isMasterPasswordVisible ? "text" : "password"}
              variant="bordered"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              isInvalid={!!errors.masterPassword}
              errorMessage={errors.masterPassword}
              placeholder="Enter master password"
              description="The master password configured by the system administrator"
              required
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={() =>
                    setIsMasterPasswordVisible(!isMasterPasswordVisible)
                  }
                >
                  {isMasterPasswordVisible ? (
                    <svg
                      className="w-5 h-5 text-default-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-default-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                color="primary"
                type="submit"
                isLoading={isLoading}
                isDisabled={isLoading}
              >
                Reset Password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Security Notes</h3>
        </CardHeader>
        <CardBody>
          <ul className="list-disc list-inside space-y-2 text-sm text-default-600">
            <li>
              Only use this feature when a user has genuinely forgotten their
              password
            </li>
            <li>The master password should be kept confidential and secure</li>
            <li>Admins cannot reset SuperAdmin passwords</li>
            <li>
              The user will be able to login immediately with the new password
            </li>
            <li>
              Consider informing the user about their new password through a
              secure channel
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};

export default PasswordResetPage;
