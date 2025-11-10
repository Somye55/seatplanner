import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Accordion,
  AccordionItem,
  Chip,
  Skeleton,
} from "@heroui/react";
import { api } from "../services/apiService";
import { authService } from "../services/authService";
import { Block, Building, Floor, Room } from "../types";

interface BlockWithHierarchy extends Block {
  buildings: (Building & {
    floors: (Floor & {
      rooms: Room[];
    })[];
  })[];
}

const LocationHierarchyPage: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const isStudent = user?.role === "Student";
  const [blocks, setBlocks] = useState<BlockWithHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch all data
      const [blocksData, buildingsData, floorsData, roomsData] =
        await Promise.all([
          api.getBlocks(),
          api.getBuildings(),
          api.getFloors(),
          api.getRooms(),
        ]);

      // Build hierarchy
      const hierarchy: BlockWithHierarchy[] = blocksData.map((block) => {
        const blockBuildings = buildingsData
          .filter((b) => b.blockId === block.id)
          .map((building) => {
            const buildingFloors = floorsData
              .filter((f) => f.buildingId === building.id)
              .map((floor) => {
                const floorRooms = roomsData.filter(
                  (r) => r.floorId === floor.id
                );
                return { ...floor, rooms: floorRooms };
              })
              .sort((a, b) => a.number - b.number);

            return { ...building, floors: buildingFloors };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        return { ...block, buildings: blockBuildings };
      });

      setBlocks(hierarchy);
    } catch (err) {
      setError("Failed to load location hierarchy");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalRooms = (block: BlockWithHierarchy) => {
    return block.buildings.reduce(
      (sum, building) =>
        sum +
        building.floors.reduce((fSum, floor) => fSum + floor.rooms.length, 0),
      0
    );
  };

  const getTotalBuildings = (block: BlockWithHierarchy) => {
    return block.buildings.length;
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Campus Locations</h1>
        <Skeleton className="w-96 h-5 rounded-lg mb-6">
          <div className="w-96 h-5 rounded-lg bg-default-200"></div>
        </Skeleton>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-2 border-default-200">
              <CardBody className="p-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-default-300"></div>
                    </Skeleton>
                    <div className="flex-1">
                      <Skeleton className="w-32 h-6 rounded-lg mb-2">
                        <div className="w-32 h-6 rounded-lg bg-default-200"></div>
                      </Skeleton>
                      <Skeleton className="w-20 h-4 rounded-lg">
                        <div className="w-20 h-4 rounded-lg bg-default-200"></div>
                      </Skeleton>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="rounded-full">
                      <div className="w-24 h-6 rounded-full bg-default-200"></div>
                    </Skeleton>
                    <Skeleton className="rounded-full">
                      <div className="w-20 h-6 rounded-full bg-default-200"></div>
                    </Skeleton>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-danger text-center">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Campus Locations</h1>
      <p className="text-default-500 mb-6">
        Browse all locations organized by blocks, buildings, floors, and rooms
      </p>

      {blocks.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-default-500">
              No locations found. Please contact an administrator.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Accordion variant="splitted" selectionMode="multiple">
          {blocks.map((block) => (
            <AccordionItem
              key={block.id}
              aria-label={block.name}
              title={
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏗️</span>
                    <div>
                      <h3 className="text-lg font-bold">{block.name}</h3>
                      <p className="text-sm text-default-500">{block.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Chip size="sm" variant="flat" color="primary">
                      {getTotalBuildings(block)} Buildings
                    </Chip>
                    <Chip size="sm" variant="flat" color="secondary">
                      {getTotalRooms(block)} Rooms
                    </Chip>
                  </div>
                </div>
              }
            >
              {block.buildings.length === 0 ? (
                <p className="text-default-500 text-sm p-4">
                  No buildings in this block
                </p>
              ) : (
                <Accordion variant="shadow" selectionMode="multiple">
                  {block.buildings.map((building) => (
                    <AccordionItem
                      key={building.id}
                      aria-label={building.name}
                      title={
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🏢</span>
                            <div>
                              <h4 className="font-semibold">{building.name}</h4>
                              <p className="text-xs text-default-500">
                                {building.code} • Distance: {building.distance}m
                              </p>
                            </div>
                          </div>
                          <Chip size="sm" variant="flat">
                            {building.floors.length} Floors
                          </Chip>
                        </div>
                      }
                    >
                      {building.floors.length === 0 ? (
                        <p className="text-default-500 text-sm p-4">
                          No floors in this building
                        </p>
                      ) : (
                        <Accordion variant="light" selectionMode="multiple">
                          {building.floors.map((floor) => (
                            <AccordionItem
                              key={floor.id}
                              aria-label={floor.name}
                              title={
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">📐</span>
                                    <div>
                                      <h5 className="font-medium">
                                        {floor.name}
                                      </h5>
                                      <p className="text-xs text-default-400">
                                        Floor {floor.number} • Distance:{" "}
                                        {floor.distance}m
                                      </p>
                                    </div>
                                  </div>
                                  <Chip size="sm" variant="dot">
                                    {floor.rooms.length} Rooms
                                  </Chip>
                                </div>
                              }
                            >
                              {floor.rooms.length === 0 ? (
                                <p className="text-default-500 text-sm p-4">
                                  No rooms on this floor
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                                  {floor.rooms.map((room) => (
                                    <Card
                                      key={room.id}
                                      isPressable={!isStudent}
                                      onPress={
                                        !isStudent
                                          ? () => navigate(`/rooms/${room.id}`)
                                          : undefined
                                      }
                                      className={
                                        !isStudent
                                          ? "hover:scale-105 transition-transform cursor-pointer"
                                          : "cursor-default"
                                      }
                                    >
                                      <CardBody className="p-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <h6 className="font-semibold text-sm">
                                              {room.name}
                                            </h6>
                                            <p className="text-xs text-default-500 mt-1">
                                              Capacity: {room.capacity}
                                            </p>
                                            <p className="text-xs text-default-400">
                                              Distance: {room.distance}m
                                            </p>
                                            {room.branchAllocated && (
                                              <Chip
                                                size="sm"
                                                color="success"
                                                variant="flat"
                                                className="mt-2"
                                              >
                                                Allocated
                                              </Chip>
                                            )}
                                          </div>
                                          <span className="text-lg">🚪</span>
                                        </div>
                                      </CardBody>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default LocationHierarchyPage;
