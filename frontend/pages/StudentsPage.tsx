import React, { useEffect, useState } from 'react';
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
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Chip,
  Spinner
} from '@heroui/react';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { Student, BRANCH_OPTIONS, Branch } from '../types';
import { ACCESSIBILITY_NEEDS } from '../constants';

const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

const StudentForm: React.FC<{ student?: Student, onSave: (student: Omit<Student, 'id'> | Student) => void, onCancel: () => void }> = ({ student, onSave, onCancel }) => {
    const [name, setName] = useState(student?.name || '');
    const [email, setEmail] = useState(student?.email || '');
    const [branch, setBranch] = useState<Branch>(student?.branch || BRANCH_OPTIONS[0].id);
    const [tags, setTags] = useState(student?.tags?.join(', ') || '');
    const [needs, setNeeds] = useState<string[]>(student?.accessibilityNeeds || []);
    const [errors, setErrors] = useState<{name?: string; email?: string; branch?: string}>({});
    
    const allocation = student?.seats && student.seats.length > 0 ? student.seats[0] : null;

    const handleNeedsChange = (needId: string) => {
        setNeeds(prev => 
            prev.includes(needId) ? prev.filter(n => n !== needId) : [...prev, needId]
        );
    };

    const validate = () => {
        const newErrors: {name?: string; email?: string; branch?: string} = {};
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
    }
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const studentData = {
            name,
            email,
            branch,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            accessibilityNeeds: needs,
        };

        if(student) {
            onSave({ ...student, ...studentData });
        } else {
            onSave(studentData as any);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              variant="bordered"
              value={name}
              onChange={e => setName(e.target.value)}
              isInvalid={!!errors.name}
              errorMessage={errors.name}
              required
            />
            <Input
              label="Email"
              type="email"
              variant="bordered"
              value={email}
              onChange={e => setEmail(e.target.value)}
              isInvalid={!!errors.email}
              errorMessage={errors.email}
              required
            />
            <Select
              label="Branch"
              variant="bordered"
              selectedKeys={[branch]}
              onChange={(e) => setBranch(e.target.value as Branch)}
              isInvalid={!!errors.branch}
              errorMessage={errors.branch}
            >
              {BRANCH_OPTIONS.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.label}
                </SelectItem>
              ))}
            </Select>
            {student && (
              <div>
                <label className="block text-sm font-medium mb-2">Current Allocation</label>
                <div className="bg-default-100 p-3 rounded-lg">
                  {allocation ? (
                    <span className="text-sm">
                      {allocation.room?.building?.code} / {allocation.room?.name} ({allocation.label})
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
              onChange={e => setTags(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Accessibility Needs</label>
              <div className="space-y-2">
                {POSSIBLE_NEEDS.map(need => (
                  <Checkbox
                    key={need.id}
                    isSelected={needs.includes(need.id)}
                    onValueChange={() => handleNeedsChange(need.id)}
                  >
                    {need.label}
                  </Checkbox>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button color="default" variant="light" onPress={onCancel}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                {student ? 'Save Changes' : 'Add Student'}
              </Button>
            </div>
        </form>
    )
}

const StudentsPage: React.FC = () => {
  const { state, dispatch } = useSeatPlanner();
  const { students, loading, error } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);

  useEffect(() => {
    const fetchStudents = async () => {
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const data = await api.getStudents();
        dispatch({ type: 'GET_STUDENTS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch students.' });
      }
    };
    
    if (students.length === 0) {
        fetchStudents();
    }
    
  }, [dispatch, students.length]);
  
  const handleSaveStudent = async (studentData: Omit<Student, 'id'> | Student) => {
    dispatch({ type: 'API_REQUEST_START' });
    try {
        if ('id' in studentData) {
            const updated = await api.updateStudent(studentData.id, studentData);
            dispatch({ type: 'UPDATE_STUDENT_SUCCESS', payload: updated });
        } else {
            const added = await api.addStudent(studentData as Omit<Student, 'id'>);
            dispatch({ type: 'ADD_STUDENT_SUCCESS', payload: added });
        }
    } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to save student.' });
    } finally {
        setIsModalOpen(false);
        setEditingStudent(undefined);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
      if(window.confirm("Are you sure you want to delete this student?")) {
        dispatch({ type: 'API_REQUEST_START' });
        try {
            await api.deleteStudent(studentId);
            dispatch({ type: 'DELETE_STUDENT_SUCCESS', payload: studentId });
        } catch (err) {
            dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to delete student.' });
        }
      }
  };
  
  const openAddModal = () => {
    setEditingStudent(undefined);
    setIsModalOpen(true);
  }

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  }

  if (loading && students.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
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
            const allocation = student.seats && student.seats.length > 0 ? student.seats[0] : null;
            return (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>
                  {BRANCH_OPTIONS.find(b => b.id === student.branch)?.label || student.branch}
                </TableCell>
                <TableCell>
                  {allocation ? (
                    <span className="text-sm">
                      {allocation.room?.building?.code} / {allocation.room?.name} ({allocation.label})
                    </span>
                  ) : (
                    <span className="text-default-500">Not Allocated</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.accessibilityNeeds.map(need => (
                      <Chip key={need} size="sm" variant="flat" color="primary">
                        {POSSIBLE_NEEDS.find(n => n.id === need)?.label || need}
                      </Chip>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.tags.map(tag => (
                      <Chip key={tag} size="sm" variant="flat">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" color="primary" variant="flat" onPress={() => openEditModal(student)}>
                      Edit
                    </Button>
                    <Button size="sm" color="danger" variant="flat" onPress={() => handleDeleteStudent(student.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingStudent ? "Edit Student" : "Add Student"}
              </ModalHeader>
              <ModalBody>
                <StudentForm 
                  student={editingStudent} 
                  onSave={handleSaveStudent} 
                  onCancel={() => setIsModalOpen(false)} 
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default StudentsPage;
