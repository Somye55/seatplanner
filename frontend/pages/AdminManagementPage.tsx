import React, { useState, useEffect } from "react";
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
import { api } from "../services/apiService";
import { showSuccessToast, showErrorToast } from "../utils/toast";

interface Admin {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

const AdminManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "" });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admins");
      setAdmins(response.data);
    } catch (error: any) {
      showErrorToast(error.response?.data?.error || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password) {
      showErrorToast("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admins", newAdmin);
      showSuccessToast("Admin created successfully");
      setNewAdmin({ email: "", password: "" });
      setShowCreateForm(false);
      fetchAdmins();
    } catch (error: any) {
      showErrorToast(error.response?.data?.error || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete admin: ${email}?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/admins/${id}`);
      showSuccessToast("Admin deleted successfully");
      fetchAdmins();
    } catch (error: any) {
      showErrorToast(error.response?.data?.error || "Failed to delete admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">👑</span>
          <h1 className="text-3xl font-bold">Admin Management</h1>
        </div>
        <Button
          color="primary"
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          ➕ Create Admin
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Create New Admin</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={newAdmin.email}
                onChange={(e) =>
                  setNewAdmin({ ...newAdmin, email: e.target.value })
                }
                required
              />
              <Input
                label="Password"
                type="password"
                value={newAdmin.password}
                onChange={(e) =>
                  setNewAdmin({ ...newAdmin, password: e.target.value })
                }
                required
                description="Minimum 6 characters"
              />
              <div className="flex gap-2">
                <Button type="submit" color="primary" isLoading={loading}>
                  Create Admin
                </Button>
                <Button
                  type="button"
                  variant="flat"
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewAdmin({ email: "", password: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Admin Accounts</h2>
        </CardHeader>
        <CardBody>
          {loading && admins.length === 0 ? (
            <div className="text-center py-8">Loading...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No admin accounts found
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(admin.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    color="danger"
                    variant="flat"
                    size="sm"
                    onPress={() => handleDeleteAdmin(admin.id, admin.email)}
                    isLoading={loading}
                  >
                    🗑️ Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminManagementPage;
