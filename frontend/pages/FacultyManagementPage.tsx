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
        type="password"
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
