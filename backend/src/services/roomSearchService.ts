import {
  PrismaClient,
  Branch,
  Room,
  Building,
  Floor,
  Block,
  RoomBooking,
} from "../../generated/prisma/client";

const prisma = new PrismaClient();

// Simple in-memory cache implementation
class SimpleCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000; // Convert to milliseconds
  }

  set(key: string, value: any): void {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { data: value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  flushAll(): void {
    this.cache.clear();
  }
}

// Initialize cache with 5-minute TTL
const searchCache = new SimpleCache(300);

export interface SearchCriteria {
  capacity: number;
  branch: Branch;
  startTime: Date;
  endTime: Date;
  preferredLocation?: {
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  };
}

export interface RoomWithHierarchy extends Room {
  floor: Floor & {
    building: Building & {
      block: Block;
    };
  };
}

export interface RoomRecommendation {
  room: RoomWithHierarchy;
  distance: number;
  score: number;
}

export class RoomSearchService {
  /**
   * Calculate distance between a room and preferred location based on hierarchy
   */
  static calculateDistance(
    room: RoomWithHierarchy,
    preferred?: { blockId?: string; buildingId?: string; floorId?: string }
  ): number {
    if (!preferred) {
      return 0;
    }

    let totalDistance = 0;

    // Block-level distance
    if (
      preferred.blockId &&
      room.floor.building.blockId !== preferred.blockId
    ) {
      totalDistance += room.floor.building.block.distance;
    }

    // Building-level distance
    if (preferred.buildingId && room.buildingId !== preferred.buildingId) {
      totalDistance += room.floor.building.distance;
    }

    // Floor-level distance
    if (preferred.floorId && room.floorId !== preferred.floorId) {
      totalDistance += room.floor.distance;
    }

    // Room-level distance (within same floor)
    if (preferred.floorId === room.floorId) {
      totalDistance += room.distance;
    }

    return totalDistance;
  }

  /**
   * Check if a room has overlapping bookings for the given time range
   */
  static async hasOverlappingBooking(
    roomId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const count = await prisma.roomBooking.count({
      where: {
        roomId,
        status: { in: ["NotStarted", "Ongoing"] },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });

    return count > 0;
  }

  /**
   * Calculate room suitability score based on capacity, availability, and location
   */
  static calculateRoomScore(
    room: RoomWithHierarchy,
    criteria: SearchCriteria,
    isAvailable: boolean,
    distance: number
  ): number {
    let score = 0;

    // 1. Capacity Score (40 points max)
    if (room.capacity === criteria.capacity) {
      score += 40; // Perfect match
    } else if (room.capacity >= criteria.capacity) {
      // Penalize excess capacity: score decreases as excess increases
      const excess = room.capacity - criteria.capacity;
      score += Math.max(0, 40 - excess * 2);
    }

    // 2. Availability Score (30 points)
    if (isAvailable) {
      score += 30;
    }

    // 3. Location Proximity Score (30 points max)
    if (criteria.preferredLocation) {
      // Closer = higher score (inverse relationship)
      score += Math.max(0, 30 - distance);
    }

    return score;
  }

  /**
   * Search for suitable rooms based on criteria
   */
  static async searchRooms(
    criteria: SearchCriteria
  ): Promise<RoomRecommendation[]> {
    // Generate cache key from criteria
    const cacheKey = JSON.stringify({
      capacity: criteria.capacity,
      branch: criteria.branch,
      startTime: criteria.startTime.toISOString(),
      endTime: criteria.endTime.toISOString(),
      preferredLocation: criteria.preferredLocation,
    });

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log("Returning cached room search results");
      return cached;
    }

    // Fetch all rooms with capacity >= requested capacity
    const rooms = await prisma.room.findMany({
      where: {
        capacity: { gte: criteria.capacity },
      },
      include: {
        floor: {
          include: {
            building: {
              include: {
                block: true,
              },
            },
          },
        },
      },
    });

    // Calculate scores for each room
    const recommendations: RoomRecommendation[] = [];

    for (const room of rooms) {
      // Check availability
      const isAvailable = !(await this.hasOverlappingBooking(
        room.id,
        criteria.startTime,
        criteria.endTime
      ));

      // Calculate distance
      const distance = this.calculateDistance(
        room as any,
        criteria.preferredLocation
      );

      // Calculate score
      const score = this.calculateRoomScore(
        room as any,
        criteria,
        isAvailable,
        distance
      );

      recommendations.push({
        room: room as any,
        distance,
        score,
      });
    }

    // Sort by score (descending)
    const sortedRecommendations = recommendations.sort(
      (a, b) => b.score - a.score
    );

    // Cache the results
    searchCache.set(cacheKey, sortedRecommendations);

    return sortedRecommendations;
  }

  /**
   * Invalidate the search cache (call when bookings are created/deleted)
   */
  static invalidateSearchCache(): void {
    console.log("Invalidating room search cache");
    searchCache.flushAll();
  }
}
