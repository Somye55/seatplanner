import React, { useEffect, useState } from "react";
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
import { Teacher } from "../types";
import { toast, showErrorToast, showSuccessToast } from "../utils/toast";

interface TeacherFormProps {
  teacher?: Teacher;
  onSave: (teacherData: {
    name: string;
    email: string;
    password?: string;
  }) => void;
  onCancel: () => void;
}

const TeacherForm: React.FC<TeacherFormProps> = ({
  teacher,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(teacher?.name || "");
  const [email, setEmail] = useState(teacher?.email || "");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  // Track if any changes have been made
  const hasChanges = teacher
    ? email !== teacher.email || password !== ""
    : true;

  const validate = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};

    // Name is required only for new teachers
    if (!teacher && !name) {
      newErrors.name = "Name is required";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    // Password is required only for new teachers
    if (!teacher && !password) {
      newErrors.password = "Password is required";
    } else if (!teacher && password && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (teacher && password && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const teacherData: { name: string; email: string; password?: string } = {
      name,
      email,
    };

    // Include password only if it's provided
    if (password) {
      teacherData.password = password;
    }

    onSave(teacherData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        variant="bordered"
        value={name}
        onChange={(e) => setName(e.target.value)}
        isInvalid={!!errors.name}
        errorMessage={errors.name}
        isDisabled={!!teacher}
        required={!teacher}
        description={teacher ? "Name cannot be changed after creation" : ""}
      />
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
      <Input
        label="Password"
        type={isPasswordVisible ? "text" : "password"}
        variant="bordered"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isInvalid={!!errors.password}
        errorMessage={errors.password}
        required={!teacher}
        description={
          teacher
            ? "Leave blank to keep current password"
            : "Minimum 6 characters"
        }
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
      <div className="flex justify-end gap-2 pt-4">
        <Button color="default" variant="light" onPress={onCancel}>
          Cancel
        </Button>
        {hasChanges && (
          <Button color="primary" type="submit">
            {teacher ? "Save Changes" : "Add Teacher"}
          </Button>
        )}
      </div>
    </form>
  );
};

const FacultyManagementPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | undefined>(
    undefined
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getTeachers();
      setTeachers(data);
    } catch (err) {
      const errorMsg = "Failed to fetch teachers";
      setError(errorMsg);
      showErrorToast(err, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeacher = async (teacherData: {
    name: string;
    email: string;
    password?: string;
  }) => {
    setLoading(true);
    setError("");
    try {
      if (editingTeacher) {
        // Update existing teacher (only email and password)
        const updateData: { email?: string; password?: string } = {
          email: teacherData.email,
        };
        if (teacherData.password) {
          updateData.password = teacherData.password;
        }
        const updated = await api.updateTeacher(editingTeacher.id, updateData);
        setTeachers((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        showSuccessToast("Teacher updated successfully");
      } else {
        // Create new teacher
        const added = await api.createTeacher({
          name: teacherData.name,
          email: teacherData.email,
          password: teacherData.password!,
        });
        setTeachers((prev) => [...prev, added]);
        showSuccessToast("Teacher created successfully");
      }
      setIsModalOpen(false);
      setEditingTeacher(undefined);
    } catch (err) {
      showErrorToast(
        err,
        editingTeacher ? "Failed to update teacher" : "Failed to create teacher"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setDeleteLoading(true);
    try {
      await api.deleteTeacher(teacherToDelete.id);
      setTeachers((prev) => prev.filter((t) => t.id !== teacherToDelete.id));
      setDeleteConfirmOpen(false);
      setTeacherToDelete(null);
      showSuccessToast("Teacher deleted successfully");
    } catch (err) {
      showErrorToast(err, "Failed to delete teacher");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTeacher(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  if (loading && teachers.length === 0) {
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
          columns={["NAME", "EMAIL", "ACTIONS"]}
          columnWidths={["w-48", "w-64", "w-32"]}
          rows={5}
        />
      </div>
    );
  }

  if (error && teachers.length === 0) {
    return <p className="text-danger text-center">{error}</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Faculty</h1>
        <Button color="primary" onPress={openAddModal}>
          Add Teacher
        </Button>
      </div>

      <Table aria-label="Faculty table" className="min-w-full">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>EMAIL</TableColumn>
          <TableColumn align="end">ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell className="font-medium">{teacher.name}</TableCell>
              <TableCell>{teacher.email}</TableCell>
              <TableCell>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => openEditModal(teacher)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => handleDeleteTeacher(teacher)}
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
          {(onClose) => (
            <>
              <ModalHeader>
                {editingTeacher ? "Edit Teacher" : "Add Teacher"}
              </ModalHeader>
              <ModalBody>
                <TeacherForm
                  teacher={editingTeacher}
                  onSave={handleSaveTeacher}
                  onCancel={() => setIsModalOpen(false)}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTeacherToDelete(null);
        }}
        onConfirm={confirmDeleteTeacher}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${teacherToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Teacher"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default FacultyManagementPage;
