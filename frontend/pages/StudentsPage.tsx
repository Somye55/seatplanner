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
  Select,
  SelectItem,
  Checkbox,
  Chip,
  Skeleton,
} from "@heroui/react";
import { SkeletonTable, ConfirmationModal } from "../components/ui";
import { useSeatPlanner } from "../context/SeatPlannerContext";
import { api } from "../services/apiService";
import { Student, BRANCH_OPTIONS, Branch } from "../types";
import { ACCESSIBILITY_NEEDS } from "../constants";
import { toast } from "../utils/toast";

const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

const StudentForm: React.FC<{
  student?: Student;
  onSave: (student: Omit<Student, "id"> | Student) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ student, onSave, onCancel, isLoading = false }) => {
  const [name, setName] = useState(student?.name || "");
  const [email, setEmail] = useState(student?.email || "");
  const [branch, setBranch] = useState<Branch>(
    student?.branch || BRANCH_OPTIONS[0].id
  );
  const [tags, setTags] = useState(student?.tags?.join(", ") || "");
  const [needs, setNeeds] = useState<string[]>(
    student?.accessibilityNeeds || []
  );
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    branch?: string;
  }>({});

  // Track if any changes have been made (exclude name for existing students)
  const hasChanges = student
    ? email !== student.email ||
      branch !== student.branch ||
      tags !== (student.tags?.join(", ") || "") ||
      JSON.stringify(needs.sort()) !==
        JSON.stringify((student.accessibilityNeeds || []).sort())
    : false;

  const allocation =
    student?.seats && student.seats.length > 0 ? student.seats[0] : null;

  const handleNeedsChange = (needId: string) => {
    setNeeds((prev) =>
      prev.includes(needId)
        ? prev.filter((n) => n !== needId)
        : [...prev, needId]
    );
  };

  const validate = () => {
    const newErrors: { name?: string; email?: string; branch?: string } = {};
    if (!name) newErrors.name = "Name is required";
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }
    if (!branch) {
      newErrors.branch = "Branch is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Exclude name from update payload for existing students
    const studentData = student
      ? {
          id: student.id,
          email,
          branch,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          accessibilityNeeds: needs,
        }
      : {
          name,
          email,
          branch,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          accessibilityNeeds: needs,
        };

    onSave(studentData as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-2">
      <Input
        label="Name"
        variant="bordered"
        value={name}
        onChange={(e) => setName(e.target.value)}
        isInvalid={!!errors.name}
        errorMessage={errors.name}
        required
        isReadOnly={!!student}
        isDisabled={!!student}
        description={student ? "Name cannot be changed" : undefined}
        classNames={{
          input: student ? "cursor-not-allowed" : undefined,
        }}
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
      <Select
        label="Branch"
        variant="bordered"
        selectedKeys={new Set([branch])}
        onSelectionChange={(keys) => {
          const selectedKey = Array.from(keys)[0] as Branch;
          setBranch(selectedKey);
        }}
        isInvalid={!!errors.branch}
        errorMessage={errors.branch}
      >
        {BRANCH_OPTIONS.map((b) => (
          <SelectItem key={b.id} textValue={b.label}>
            {b.label}
          </SelectItem>
        ))}
      </Select>
      {student && (
        <div>
          <label className="block text-sm font-medium text-foreground-600 mb-2">
            Current Allocation
          </label>
          <div className="bg-default-100 border border-default-200 p-3 rounded-lg">
            {allocation ? (
              <span className="text-sm font-medium">
                {allocation.room?.building?.code} / {allocation.room?.name} (
                {allocation.label})
              </span>
            ) : (
              <span className="text-sm text-default-500">Not Allocated</span>
            )}
          </div>
        </div>
      )}
      <Input
        label="Tags (comma separated)"
        variant="bordered"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="e.g., honors, athlete, international"
      />
      <div className="pt-2">
        <label className="block text-sm font-medium text-foreground-600 mb-4">
          Accessibility Needs
        </label>
        <div className="bg-default-50 border border-default-200 rounded-lg p-4 space-y-3">
          {POSSIBLE_NEEDS.map((need) => (
            <div
              key={need.id}
              className="flex items-center py-1 hover:bg-default-100 rounded-md px-2 -mx-2 transition-colors"
            >
              <Checkbox
                isSelected={needs.includes(need.id)}
                onValueChange={() => handleNeedsChange(need.id)}
                classNames={{
                  wrapper: "mr-3",
                }}
              >
                <span className="text-sm">{need.label}</span>
              </Checkbox>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t border-default-200">
        <Button
          color="default"
          variant="light"
          onPress={onCancel}
          isDisabled={isLoading}
        >
          Cancel
        </Button>
        {(!student || hasChanges) && (
          <Button color="primary" type="submit" isLoading={isLoading}>
            {student ? "Save Changes" : "Add Student"}
          </Button>
        )}
      </div>
    </form>
  );
};

const StudentsPage: React.FC = () => {
  const { state, dispatch } = useSeatPlanner();
  const { students, loading, error } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(
    undefined
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      dispatch({ type: "API_REQUEST_START" });
      try {
        const data = await api.getStudents();
        dispatch({ type: "GET_STUDENTS_SUCCESS", payload: data });
      } catch (err) {
        const errorMsg = "Failed to fetch students.";
        dispatch({
          type: "API_REQUEST_FAIL",
          payload: errorMsg,
        });
        toast.error("Error", errorMsg);
      }
    };

    if (students.length === 0) {
      fetchStudents();
    }
  }, [dispatch, students.length]);

  const handleSaveStudent = async (
    studentData: Omit<Student, "id"> | Student
  ) => {
    setSaveLoading(true);
    dispatch({ type: "API_REQUEST_START" });
    try {
      if ("id" in studentData) {
        const updated = await api.updateStudent(studentData.id, studentData);
        dispatch({ type: "UPDATE_STUDENT_SUCCESS", payload: updated });
      } else {
        const added = await api.addStudent(studentData as Omit<Student, "id">);
        dispatch({ type: "ADD_STUDENT_SUCCESS", payload: added });
      }
      setIsModalOpen(false);
      setEditingStudent(undefined);
    } catch (err) {
      const errorMsg = "Failed to save student.";
      dispatch({
        type: "API_REQUEST_FAIL",
        payload: errorMsg,
      });
      toast.error("Error", errorMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleteLoading(true);
    dispatch({ type: "API_REQUEST_START" });
    try {
      await api.deleteStudent(studentToDelete.id);
      dispatch({ type: "DELETE_STUDENT_SUCCESS", payload: studentToDelete.id });
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      const errorMsg = "Failed to delete student.";
      dispatch({
        type: "API_REQUEST_FAIL",
        payload: errorMsg,
      });
      toast.error("Error", errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStudent(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  if (loading && students.length === 0) {
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
          columns={[
            "NAME",
            "EMAIL",
            "BRANCH",
            "ALLOCATION",
            "NEEDS",
            "TAGS",
            "ACTIONS",
          ]}
          columnWidths={[
            "w-32",
            "w-40",
            "w-28",
            "w-36",
            "w-24",
            "w-20",
            "w-24",
          ]}
          rows={5}
        />
      </div>
    );
  }

  if (error) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Students</h1>
        <Button color="primary" onPress={openAddModal}>
          Add Student
        </Button>
      </div>

      <Table aria-label="Students table" className="min-w-full">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>EMAIL</TableColumn>
          <TableColumn>BRANCH</TableColumn>
          <TableColumn>ALLOCATION</TableColumn>
          <TableColumn>NEEDS</TableColumn>
          <TableColumn>TAGS</TableColumn>
          <TableColumn align="end">ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const allocation =
              student.seats && student.seats.length > 0
                ? student.seats[0]
                : null;
            return (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>
                  {BRANCH_OPTIONS.find((b) => b.id === student.branch)?.label ||
                    student.branch}
                </TableCell>
                <TableCell>
                  {allocation ? (
                    <span className="text-sm">
                      {allocation.room?.building?.code} /{" "}
                      {allocation.room?.name} ({allocation.label})
                    </span>
                  ) : (
                    <span className="text-default-500">Not Allocated</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.accessibilityNeeds.map((need) => (
                      <Chip key={need} size="sm" variant="flat" color="primary">
                        {POSSIBLE_NEEDS.find((n) => n.id === need)?.label ||
                          need}
                      </Chip>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.tags.map((tag) => (
                      <Chip key={tag} size="sm" variant="flat">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onPress={() => openEditModal(student)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={() => handleDeleteStudent(student)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          body: "py-6",
          header: "border-b border-default-200",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">
                  {editingStudent ? "Edit Student" : "Add Student"}
                </h2>
                <p className="text-sm font-normal text-default-500">
                  {editingStudent
                    ? "Update student information and accessibility preferences"
                    : "Add a new student to the system"}
                </p>
              </ModalHeader>
              <ModalBody>
                <StudentForm
                  student={editingStudent}
                  onSave={handleSaveStudent}
                  onCancel={() => setIsModalOpen(false)}
                  isLoading={saveLoading}
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
          setStudentToDelete(null);
        }}
        onConfirm={confirmDeleteStudent}
        title="Delete Student"
        message={`Are you sure you want to delete "${studentToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Student"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default StudentsPage;
