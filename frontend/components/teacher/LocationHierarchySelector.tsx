import React, { useState, useEffect } from "react";
import { Select, SelectItem } from "@heroui/react";
import { BlockIcon, BuildingIcon, FloorIcon } from "../ui";
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
  isOptional?: boolean;
}

const LocationHierarchySelector: React.FC<LocationHierarchySelectorProps> = ({
  onSelect,
  value,
  isOptional = true,
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

  // Sync internal state with value prop changes
  useEffect(() => {
    setSelectedBlockId(value?.blockId || "");
    setSelectedBuildingId(value?.buildingId || "");
    setSelectedFloorId(value?.floorId || "");
  }, [value?.blockId, value?.buildingId, value?.floorId]);

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
    const keysArray = Array.from(keys);
    const blockId = keysArray.length > 0 ? (keysArray[0] as string) : "";

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
    const keysArray = Array.from(keys);
    const buildingId = keysArray.length > 0 ? (keysArray[0] as string) : "";

    setSelectedBuildingId(buildingId);
    setSelectedFloorId("");

    onSelect({
      blockId: selectedBlockId || undefined,
      buildingId: buildingId || undefined,
      floorId: undefined,
    });
  };

  const handleFloorChange = (keys: any) => {
    const keysArray = Array.from(keys);
    const floorId = keysArray.length > 0 ? (keysArray[0] as string) : "";

    setSelectedFloorId(floorId);

    onSelect({
      blockId: selectedBlockId || undefined,
      buildingId: selectedBuildingId || undefined,
      floorId: floorId || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <BlockIcon className="h-5 w-5" variant="solid" />
        </div>
        <Select
          label={isOptional ? "Preferred Block (Optional)" : "Block"}
          placeholder="Select a block"
          selectionMode="single"
          selectedKeys={
            selectedBlockId && selectedBlockId !== ""
              ? new Set([selectedBlockId])
              : new Set()
          }
          onSelectionChange={handleBlockChange}
          isLoading={loadingBlocks}
          variant="bordered"
          disallowEmptySelection={false}
          isRequired={!isOptional}
          classNames={{
            trigger: "pl-12",
          }}
        >
          {blocks.map((block) => (
            <SelectItem
              key={block.id}
              textValue={`${block.name} (${block.code})`}
            >
              {block.name} ({block.code})
            </SelectItem>
          ))}
        </Select>
      </div>

      {(selectedBlockId || buildings.length > 0) && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <BuildingIcon className="h-5 w-5" variant="solid" />
          </div>
          <Select
            label={isOptional ? "Preferred Building (Optional)" : "Building"}
            placeholder="Select a building"
            selectionMode="single"
            selectedKeys={
              selectedBuildingId && selectedBuildingId !== ""
                ? new Set([selectedBuildingId])
                : new Set()
            }
            onSelectionChange={handleBuildingChange}
            isLoading={loadingBuildings}
            isDisabled={!selectedBlockId || buildings.length === 0}
            variant="bordered"
            disallowEmptySelection={false}
            isRequired={!isOptional}
            classNames={{
              trigger: "pl-12",
            }}
          >
            {buildings.map((building) => (
              <SelectItem
                key={building.id}
                textValue={`${building.name} (${building.code})`}
              >
                {building.name} ({building.code})
              </SelectItem>
            ))}
          </Select>
        </div>
      )}

      {(selectedBuildingId || floors.length > 0) && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <FloorIcon className="h-5 w-5" variant="solid" />
          </div>
          <Select
            label={isOptional ? "Preferred Floor (Optional)" : "Floor"}
            placeholder="Select a floor"
            selectionMode="single"
            selectedKeys={
              selectedFloorId && selectedFloorId !== ""
                ? new Set([selectedFloorId])
                : new Set()
            }
            onSelectionChange={handleFloorChange}
            isLoading={loadingFloors}
            isDisabled={!selectedBuildingId || floors.length === 0}
            variant="bordered"
            disallowEmptySelection={false}
            isRequired={!isOptional}
            classNames={{
              trigger: "pl-12",
            }}
          >
            {floors.map((floor) => (
              <SelectItem
                key={floor.id}
                textValue={`${floor.name} (Floor ${floor.number})`}
              >
                {floor.name} (Floor {floor.number})
              </SelectItem>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
};

export default LocationHierarchySelector;
