import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
  Skeleton,
} from "@heroui/react";
import { SkeletonTable, ConfirmationModal } from "../components/ui";
import { api } from "../services/apiService";
import { showSuccessToast, showErrorToast } from "../utils/toast";

interface Admin {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AdminFormProps {
  admin?: Admin;
  onSave: (adminData: { email: string; password?: string }) => void;
  onCancel: () => void;
}

const AdminForm: React.FC<AdminFormProps> = ({ admin, onSave, onCancel }) => {
  const [email, setEmail] = useState(admin?.email || "");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Track if any changes have been made
  const hasChanges = admin ? email !== admin.email : true;

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    // Password is required only for new admins
    if (!admin && !password) {
      newErrors.password = "Password is required";
    } else if (!admin && password && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const adminData: { email: string; password?: string } = { email };

    // Include password only for new admins
    if (!admin && password) {
      adminData.password = password;
    }

    onSave(adminData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        variant="bordered"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        isInvalid={!!errors.email}
        errorMessage={errors.email}
        required
      />
      {!admin && (
        <Input
          label="Password"
          type={isPasswordVisible ? "text" : "password"}
          variant="bordered"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isInvalid={!!errors.password}
          errorMessage={errors.password}
          required
          description="Minimum 6 characters"
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
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button color="default" variant="light" onPress={onCancel}>
          Cancel
        </Button>
        {hasChanges && (
          <Button color="primary" type="submit">
            {admin ? "Save Changes" : "Add Admin"}
          </Button>
        )}
      </div>
    </form>
  );
};

const AdminManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | undefined>(
    undefined
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdmins();
      setAdmins(data);
    } catch (err) {
      const errorMsg = "Failed to fetch admins";
      setError(errorMsg);
      showErrorToast(err, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdmin = async (adminData: {
    email: string;
    password?: string;
  }) => {
    setLoading(true);
    setError("");
    try {
      if (editingAdmin) {
        // Update existing admin
        const updated = await api.updateAdmin(editingAdmin.id, adminData);
        setAdmins((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        showSuccessToast("Admin updated successfully");
      } else {
        // Create new admin
        const added = await api.createAdmin({
          email: adminData.email,
          password: adminData.password!,
        });
        setAdmins((prev) => [...prev, added]);
        showSuccessToast("Admin created successfully");
      }
      setIsModalOpen(false);
      setEditingAdmin(undefined);
    } catch (err) {
      showErrorToast(
        err,
        editingAdmin ? "Failed to update admin" : "Failed to create admin"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = (admin: Admin) => {
    setAdminToDelete(admin);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeleteLoading(true);
    try {
      await api.deleteAdmin(adminToDelete.id);
      setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id));
      setDeleteConfirmOpen(false);
      setAdminToDelete(null);
      showSuccessToast("Admin deleted successfully");
    } catch (err) {
      showErrorToast(err, "Failed to delete admin");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAdmin(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  if (loading && admins.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="rounded-lg">
            <div className="h-10 w-32 rounded-lg bg-default-200"></div>
          </Skeleton>
          <Skeleton className="rounded-lg">
            <div className="h-10 w-28 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
        <SkeletonTable
          columns={["EMAIL", "CREATED", "ACTIONS"]}
          columnWidths={["w-64", "w-32", "w-32"]}
          rows={5}
        />
      </div>
    );
  }

  if (error && admins.length === 0) {
    return <p className="text-danger text-center">{error}</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <Button color="primary" onPress={openAddModal}>
          Add Admin
        </Button>
      </div>

      <Table aria-label="Admins table" className="min-w-full">
        <TableHeader>
          <TableColumn>EMAIL</TableColumn>
          <TableColumn>CREATED</TableColumn>
          <TableColumn align="end">ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell className="font-medium">{admin.email}</TableCell>
              <TableCell>
                {new Date(admin.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => openEditModal(admin)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => handleDeleteAdmin(admin)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <>
            <ModalHeader>
              {editingAdmin ? "Edit Admin" : "Add Admin"}
            </ModalHeader>
            <ModalBody>
              <AdminForm
                admin={editingAdmin}
                onSave={handleSaveAdmin}
                onCancel={() => setIsModalOpen(false)}
              />
            </ModalBody>
          </>
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setAdminToDelete(null);
        }}
        onConfirm={confirmDeleteAdmin}
        title="Delete Admin"
        message={`Are you sure you want to delete "${adminToDelete?.email}"? This action cannot be undone.`}
        confirmText="Delete Admin"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminManagementPage;
