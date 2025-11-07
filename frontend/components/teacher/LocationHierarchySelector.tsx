import React, { useState, useEffect } from "react";
import { Select, SelectItem } from "@heroui/react";
import { api } from "../../services/apiService";
import { Block, Building, Floor } from "../../types";

interface LocationHierarchySelectorProps {
  onSelect: (location: {
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  }) => void;
  value?: {
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  };
}

const LocationHierarchySelector: React.FC<LocationHierarchySelectorProps> = ({
  onSelect,
  value,
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    value?.blockId || ""
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    value?.buildingId || ""
  );
  const [selectedFloorId, setSelectedFloorId] = useState<string>(
    value?.floorId || ""
  );

  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);

  // Load blocks on mount
  useEffect(() => {
    const loadBlocks = async () => {
      setLoadingBlocks(true);
      try {
        const data = await api.getBlocks();
        setBlocks(data);
      } catch (error) {
        console.error("Failed to load blocks:", error);
      } finally {
        setLoadingBlocks(false);
      }
    };
    loadBlocks();
  }, []);

  // Load buildings when block is selected
  useEffect(() => {
    const loadBuildings = async () => {
      if (!selectedBlockId) {
        setBuildings([]);
        return;
      }

      setLoadingBuildings(true);
      try {
        const allBuildings = await api.getBuildings();
        const filteredBuildings = allBuildings.filter(
          (b) => b.blockId === selectedBlockId
        );
        setBuildings(filteredBuildings);
      } catch (error) {
        console.error("Failed to load buildings:", error);
      } finally {
        setLoadingBuildings(false);
      }
    };
    loadBuildings();
  }, [selectedBlockId]);

  // Load floors when building is selected
  useEffect(() => {
    const loadFloors = async () => {
      if (!selectedBuildingId) {
        setFloors([]);
        return;
      }

      setLoadingFloors(true);
      try {
        const data = await api.getFloors(selectedBuildingId);
        setFloors(data);
      } catch (error) {
        console.error("Failed to load floors:", error);
      } finally {
        setLoadingFloors(false);
      }
    };
    loadFloors();
  }, [selectedBuildingId]);

  const handleBlockChange = (keys: any) => {
    const blockId = Array.from(keys)[0] as string;
    setSelectedBlockId(blockId);
    setSelectedBuildingId("");
    setSelectedFloorId("");

    onSelect({
      blockId: blockId || undefined,
      buildingId: undefined,
      floorId: undefined,
    });
  };

  const handleBuildingChange = (keys: any) => {
    const buildingId = Array.from(keys)[0] as string;
    setSelectedBuildingId(buildingId);
    setSelectedFloorId("");

    onSelect({
      blockId: selectedBlockId || undefined,
      buildingId: buildingId || undefined,
      floorId: undefined,
    });
  };

  const handleFloorChange = (keys: any) => {
    const floorId = Array.from(keys)[0] as string;
    setSelectedFloorId(floorId);

    onSelect({
      blockId: selectedBlockId || undefined,
      buildingId: selectedBuildingId || undefined,
      floorId: floorId || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <Select
        label="Preferred Block (Optional)"
        placeholder="Select a block"
        selectedKeys={selectedBlockId ? new Set([selectedBlockId]) : new Set()}
        onSelectionChange={handleBlockChange}
        isLoading={loadingBlocks}
        variant="bordered"
      >
        {blocks.map((block) => (
          <SelectItem key={block.id}>
            {block.name} ({block.code})
          </SelectItem>
        ))}
      </Select>

      {selectedBlockId && (
        <Select
          label="Preferred Building (Optional)"
          placeholder="Select a building"
          selectedKeys={
            selectedBuildingId ? new Set([selectedBuildingId]) : new Set()
          }
          onSelectionChange={handleBuildingChange}
          isLoading={loadingBuildings}
          isDisabled={!selectedBlockId || buildings.length === 0}
          variant="bordered"
        >
          {buildings.map((building) => (
            <SelectItem key={building.id}>
              {building.name} ({building.code})
            </SelectItem>
          ))}
        </Select>
      )}

      {selectedBuildingId && (
        <Select
          label="Preferred Floor (Optional)"
          placeholder="Select a floor"
          selectedKeys={
            selectedFloorId ? new Set([selectedFloorId]) : new Set()
          }
          onSelectionChange={handleFloorChange}
          isLoading={loadingFloors}
          isDisabled={!selectedBuildingId || floors.length === 0}
          variant="bordered"
        >
          {floors.map((floor) => (
            <SelectItem key={floor.id}>
              {floor.name} (Floor {floor.number})
            </SelectItem>
          ))}
        </Select>
      )}
    </div>
  );
};

export default LocationHierarchySelector;
