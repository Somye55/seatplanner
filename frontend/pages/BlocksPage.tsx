import React, { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Skeleton,
} from "@heroui/react";
import { ConfirmationModal } from "../components/ui";
import { api } from "../services/apiService";
import { authService } from "../services/authService";
import { Block } from "../types";

const BlockIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 w-16 text-primary"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const BlockSkeleton: React.FC = () => (
  <Card className="w-full">
    <CardBody className="gap-4">
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <Skeleton className="rounded-lg">
            <div className="h-16 w-16 rounded-lg bg-default-300"></div>
          </Skeleton>
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="w-4/5 rounded-lg">
            <div className="h-7 w-full rounded-lg bg-default-200"></div>
          </Skeleton>
          <Skeleton className="w-2/5 rounded-lg">
            <div className="h-5 w-full rounded-lg bg-default-200"></div>
          </Skeleton>
          <Skeleton className="w-1/3 rounded-lg">
            <div className="h-5 w-full rounded-lg bg-default-300"></div>
          </Skeleton>
        </div>
      </div>
    </CardBody>
    <CardFooter className="justify-end border-t border-divider">
      <div className="flex gap-2">
        <Skeleton className="w-12 rounded-lg">
          <div className="h-8 w-full rounded-lg bg-default-200"></div>
        </Skeleton>
        <Skeleton className="w-16 rounded-lg">
          <div className="h-8 w-full rounded-lg bg-default-200"></div>
        </Skeleton>
      </div>
    </CardFooter>
  </Card>
);

const BlocksPage: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlock, setNewBlock] = useState({ name: "", code: "", distance: 0 });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [editBlock, setEditBlock] = useState({
    name: "",
    code: "",
    distance: 0,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const isAdmin = authService.isAdmin();

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const data = await api.getBlocks();
      setBlocks(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch blocks.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createBlock(newBlock);
      setNewBlock({ name: "", code: "", distance: 0 });
      setShowCreateModal(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchBlocks();
    } catch (err) {
      console.error("Failed to create block:", err);
      alert(`Failed to create block: ${(err as Error).message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditBlock = (block: Block) => {
    setEditingBlock(block);
    setEditBlock({
      name: block.name,
      code: block.code,
      distance: block.distance,
    });
  };

  const handleUpdateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;
    setEditLoading(true);
    try {
      await api.updateBlock(editingBlock.id, editBlock);
      setEditingBlock(null);
      setEditBlock({ name: "", code: "", distance: 0 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchBlocks();
    } catch (err) {
      console.error("Failed to update block:", err);
      alert(`Failed to update block: ${(err as Error).message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBlock = (block: Block) => {
    setBlockToDelete(block);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    setDeleteLoading(blockToDelete.id);
    try {
      await api.deleteBlock(blockToDelete.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchBlocks();
      setDeleteConfirmOpen(false);
      setBlockToDelete(null);
    } catch (err) {
      console.error("Failed to delete block:", err);
      alert(`Failed to delete block: ${(err as Error).message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading && blocks.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-48 rounded-lg">
            <div className="h-10 w-48 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <BlockSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blocks</h1>
        {isAdmin && (
          <Button color="primary" onPress={() => setShowCreateModal(true)}>
            Add Block
          </Button>
        )}
      </div>

      {!loading && blocks.length === 0 && !isAdmin && (
        <p className="text-default-500 text-center">
          No blocks found. You may need to seed the database.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blocks.map((block) => (
          <Card
            key={block.id}
            className="hover:scale-105 transition-transform duration-300"
            isPressable
          >
            <CardBody className="gap-4">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <BlockIcon />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{block.name}</h2>
                  <p className="text-default-500">{block.code}</p>
                  <p className="text-secondary font-semibold mt-2">
                    Distance: {block.distance}m
                  </p>
                </div>
              </div>
            </CardBody>
            {isAdmin && (
              <CardFooter className="justify-end border-t border-divider">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => handleEditBlock(block)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => handleDeleteBlock(block)}
                    isLoading={deleteLoading === block.id}
                  >
                    Delete
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {/* Create Block Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleCreateBlock}>
              <ModalHeader>Create New Block</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Block Name"
                    variant="bordered"
                    value={newBlock.name}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Block Code"
                    variant="bordered"
                    value={newBlock.code}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, code: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={newBlock.distance.toString()}
                    onChange={(e) =>
                      setNewBlock({
                        ...newBlock,
                        distance: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={createLoading}>
                  Create Block
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Block Modal */}
      <Modal
        isOpen={!!editingBlock}
        onClose={() => setEditingBlock(null)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateBlock}>
              <ModalHeader>Edit Block</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Block Name"
                    variant="bordered"
                    value={editBlock.name}
                    onChange={(e) =>
                      setEditBlock({ ...editBlock, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Block Code"
                    variant="bordered"
                    value={editBlock.code}
                    onChange={(e) =>
                      setEditBlock({ ...editBlock, code: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={editBlock.distance.toString()}
                    onChange={(e) =>
                      setEditBlock({
                        ...editBlock,
                        distance: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={editLoading}>
                  Update Block
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setBlockToDelete(null);
        }}
        onConfirm={confirmDeleteBlock}
        title="Delete Block"
        message={`Are you sure you want to delete "${blockToDelete?.name}" (${blockToDelete?.code})? This will also delete all buildings, floors, rooms, and seats in this block. This action cannot be undone.`}
        confirmText="Delete Block"
        isLoading={deleteLoading === blockToDelete?.id}
        variant="danger"
      />
    </div>
  );
};

export default BlocksPage;
