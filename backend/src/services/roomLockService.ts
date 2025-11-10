import { Server } from "socket.io";

interface RoomLock {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  lockedAt: Date;
  expiresAt: Date;
}

/**
 * Service to manage room booking locks to prevent race conditions
 * Uses in-memory storage with automatic expiration
 */
export class RoomLockService {
  private locks: Map<string, RoomLock> = new Map();
  private readonly LOCK_DURATION_MS = 30000; // 30 seconds to complete booking

  /**
   * Generate a unique lock key for a room and time slot
   */
  private getLockKey(roomId: string, startTime: Date, endTime: Date): string {
    return `${roomId}:${startTime.toISOString()}:${endTime.toISOString()}`;
  }

  /**
   * Attempt to acquire a lock for a room booking
   * @returns true if lock acquired, false if already locked
   */
  acquireLock(
    roomId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): boolean {
    const lockKey = this.getLockKey(roomId, startTime, endTime);
    const existingLock = this.locks.get(lockKey);

    // Check if lock exists and hasn't expired
    if (existingLock) {
      if (existingLock.expiresAt > new Date()) {
        // Lock is still valid
        return existingLock.userId === userId; // Only same user can proceed
      } else {
        // Lock expired, remove it
        this.locks.delete(lockKey);
      }
    }

    // Acquire new lock
    const lock: RoomLock = {
      roomId,
      userId,
      startTime,
      endTime,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + this.LOCK_DURATION_MS),
    };

    this.locks.set(lockKey, lock);
    return true;
  }

  /**
   * Release a lock after booking is complete or failed
   */
  releaseLock(roomId: string, startTime: Date, endTime: Date): void {
    const lockKey = this.getLockKey(roomId, startTime, endTime);
    this.locks.delete(lockKey);
  }

  /**
   * Get the current lock holder for a room/time slot
   */
  getLockHolder(roomId: string, startTime: Date, endTime: Date): string | null {
    const lockKey = this.getLockKey(roomId, startTime, endTime);
    const lock = this.locks.get(lockKey);

    if (lock && lock.expiresAt > new Date()) {
      return lock.userId;
    }

    return null;
  }

  /**
   * Clean up expired locks (called periodically)
   */
  cleanupExpiredLocks(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all active locks (for debugging)
   */
  getActiveLocks(): RoomLock[] {
    const now = new Date();
    return Array.from(this.locks.values()).filter(
      (lock) => lock.expiresAt > now
    );
  }
}

// Singleton instance
export const roomLockService = new RoomLockService();
