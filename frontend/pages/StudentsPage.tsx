import React, { useEffect, useState } from 'react';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { Card, Spinner, Button, Modal } from '../components/ui';
import { Student, BRANCH_OPTIONS, Branch } from '../types';

// A centralized list of possible needs. In a more advanced app, this could be fetched from the API.
const POSSIBLE_NEEDS = [
    { id: 'front_row', label: 'Front Row' },
    { id: 'wheelchair_access', label: 'Wheelchair Access' },
    { id: 'near_exit', label: 'Near Exit' },
];

const StudentForm: React.FC<{ student?: Student, onSave: (student: Omit<Student, 'id'> | Student) => void, onCancel: () => void }> = ({ student, onSave, onCancel }) => {
    const [name, setName] = useState(student?.name || '');
    const [email, setEmail] = useState(student?.email || '');
    const [branch, setBranch] = useState<Branch>(student?.branch || BRANCH_OPTIONS[0].id);
    const [tags, setTags] = useState(student?.tags?.join(', ') || '');
    const [needs, setNeeds] = useState<string[]>(student?.accessibilityNeeds || []);
    const [errors, setErrors] = useState<{name?: string; email?: string; branch?: string}>({});

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
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                    <select value={branch} onChange={e => setBranch(e.target.value as Branch)} className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.branch ? 'border-red-500' : 'border-gray-300'}`}>
                        {BRANCH_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                    <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Accessibility Needs</label>
                    <div className="mt-2 space-y-2">
                        {POSSIBLE_NEEDS.map(need => (
                            <label key={need.id} className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={needs.includes(need.id)}
                                    onChange={() => handleNeedsChange(need.id)}
                                />
                                <span className="ml-2 text-sm text-gray-700">{need.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit">{student ? 'Save Changes' : 'Add Student'}</Button>
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

  if (loading && students.length === 0) return <Spinner />;
  if (error) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Students</h1>
        <Button onClick={openAddModal}>Add Student</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Needs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => {
                const allocation = student.seats && student.seats.length > 0 ? student.seats[0] : null;
                return (
                    <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {BRANCH_OPTIONS.find(b => b.id === student.branch)?.label || student.branch}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {allocation ? `${allocation.room?.building?.code} / ${allocation.room?.name} (${allocation.label})` : 'Not Allocated'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.accessibilityNeeds.join(', ')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.tags.join(', ')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Button variant="secondary" onClick={() => openEditModal(student)}>Edit</Button>
                            <Button variant="danger" onClick={() => handleDeleteStudent(student.id)}>Delete</Button>
                        </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStudent ? "Edit Student" : "Add Student"}>
        <StudentForm student={editingStudent} onSave={handleSaveStudent} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default StudentsPage;
