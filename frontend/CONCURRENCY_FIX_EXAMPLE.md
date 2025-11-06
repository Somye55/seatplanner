# Frontend Concurrency Fix - Complete Example

## The Problem

When Admin A successfully updates a seat, Admin B (who tried to update simultaneously) receives a 409 error. However, Admin B's frontend still has the OLD version number, so their next update attempt also fails.

## The Solution

The frontend must:
1. **Handle 409 responses** by updating local state with the current data
2. **Listen to WebSocket events** to receive real-time updates from other admins
3. **Always use the latest version** when making updates

## Complete Implementation

### 1. State Management (React + Context/Redux)

```typescript
// types.ts
export interface Seat {
  id: string;
  roomId: string;
  label: string;
  row: number;
  col: number;
  status: 'Available' | 'Allocated' | 'Broken';
  version: number;  // ← Critical!
  studentId?: string;
  features: string[];
}

// seatStore.ts (using Zustand as example)
import create from 'zustand';
import { Seat } from './types';

interface SeatStore {
  seats: Map<string, Seat>;
  updateSeat: (seat: Seat) => void;
  getSeat: (id: string) => Seat | undefined;
}

export const useSeatStore = create<SeatStore>((set, get) => ({
  seats: new Map(),
  
  updateSeat: (seat: Seat) => {
    set((state) => {
      const newSeats = new Map(state.seats);
      newSeats.set(seat.id, seat);
      return { seats: newSeats };
    });
  },
  
  getSeat: (id: string) => {
    return get().seats.get(id);
  },
}));
```

### 2. WebSocket Setup

```typescript
// socket.ts
import { io, Socket } from 'socket.io-client';
import { useSeatStore } from './seatStore';

let socket: Socket | null = null;

export function initializeSocket() {
  if (socket) return socket;
  
  socket = io('http://localhost:3000', {
    auth: {
      token: localStorage.getItem('authToken')
    }
  });
  
  // Listen for seat updates from other admins
  socket.on('seatUpdated', (updatedSeat: Seat) => {
    console.log('Received seat update via WebSocket:', updatedSeat);
    
    // Update local state with new version
    useSeatStore.getState().updateSeat(updatedSeat);
  });
  
  socket.on('roomUpdated', () => {
    console.log('Room updated, refreshing data...');
    // Optionally refresh room data
  });
  
  socket.on('allocationsUpdated', () => {
    console.log('Allocations updated, refreshing...');
    // Refresh allocation data
  });
  
  return socket;
}

export function getSocket() {
  return socket;
}
```

### 3. API Service with Conflict Handling

```typescript
// api/seats.ts
import { Seat } from '../types';
import { useSeatStore } from '../seatStore';

interface UpdateSeatStatusParams {
  seatId: string;
  status: 'Available' | 'Allocated' | 'Broken';
  version: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  conflict?: boolean;
  error?: string;
}

export async function updateSeatStatus(
  params: UpdateSeatStatusParams
): Promise<ApiResponse<Seat>> {
  try {
    const response = await fetch(`/api/seats/${params.seatId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        status: params.status,
        version: params.version
      })
    });

    // Handle conflict (409)
    if (response.status === 409) {
      const data = await response.json();
      
      console.log('Conflict detected:', data);
      
      // ✅ CRITICAL: Update local state with current seat data
      if (data.currentSeat) {
        useSeatStore.getState().updateSeat(data.currentSeat);
      }
      
      return {
        success: false,
        conflict: true,
        error: data.message
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const updatedSeat = await response.json();
    
    // ✅ Update local state with successful response
    useSeatStore.getState().updateSeat(updatedSeat);
    
    return {
      success: true,
      data: updatedSeat
    };
    
  } catch (error) {
    console.error('Error updating seat:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateSeatFeatures(
  seatId: string,
  features: string[],
  version: number
): Promise<ApiResponse<Seat>> {
  try {
    const response = await fetch(`/api/seats/${seatId}/features`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ features, version })
    });

    if (response.status === 409) {
      const data = await response.json();
      
      // ✅ Update local state
      if (data.currentSeat) {
        useSeatStore.getState().updateSeat(data.currentSeat);
      }
      
      return {
        success: false,
        conflict: true,
        error: data.message
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const updatedSeat = await response.json();
    useSeatStore.getState().updateSeat(updatedSeat);
    
    return {
      success: true,
      data: updatedSeat
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 4. React Component with Proper Handling

```typescript
// components/SeatCard.tsx
import React, { useState, useEffect } from 'react';
import { useSeatStore } from '../seatStore';
import { updateSeatStatus } from '../api/seats';
import { toast } from 'react-toastify'; // or your notification library

interface SeatCardProps {
  seatId: string;
}

export function SeatCard({ seatId }: SeatCardProps) {
  const seat = useSeatStore((state) => state.getSeat(seatId));
  const [isUpdating, setIsUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  // Visual indicator when seat is updated by others
  useEffect(() => {
    if (justUpdated) {
      const timer = setTimeout(() => setJustUpdated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [justUpdated]);

  // Listen for updates to this specific seat
  useEffect(() => {
    const unsubscribe = useSeatStore.subscribe(
      (state) => state.seats.get(seatId),
      (newSeat, prevSeat) => {
        if (newSeat && prevSeat && newSeat.version !== prevSeat.version) {
          setJustUpdated(true);
        }
      }
    );
    
    return unsubscribe;
  }, [seatId]);

  if (!seat) {
    return <div>Loading...</div>;
  }

  const handleStatusChange = async (newStatus: 'Available' | 'Allocated' | 'Broken') => {
    setIsUpdating(true);
    
    try {
      // ✅ Always use the CURRENT version from state
      const currentSeat = useSeatStore.getState().getSeat(seatId);
      if (!currentSeat) {
        toast.error('Seat not found');
        return;
      }

      const result = await updateSeatStatus({
        seatId: seat.id,
        status: newStatus,
        version: currentSeat.version  // ← Use latest version!
      });

      if (result.success) {
        toast.success('Seat updated successfully');
      } else if (result.conflict) {
        // ✅ State already updated by API function
        toast.warning(
          'This seat was just modified by another admin. Your view has been updated. Please try again.',
          { autoClose: 5000 }
        );
      } else {
        toast.error(result.error || 'Failed to update seat');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className={`seat-card ${justUpdated ? 'just-updated' : ''}`}
      style={{
        border: justUpdated ? '2px solid #4CAF50' : '1px solid #ccc',
        transition: 'border 0.3s ease'
      }}
    >
      <div className="seat-label">{seat.label}</div>
      <div className="seat-status">Status: {seat.status}</div>
      <div className="seat-version" style={{ fontSize: '0.8em', color: '#666' }}>
        Version: {seat.version}
      </div>
      
      <div className="seat-actions">
        <button
          onClick={() => handleStatusChange('Available')}
          disabled={isUpdating || seat.status === 'Available'}
        >
          Mark Available
        </button>
        <button
          onClick={() => handleStatusChange('Broken')}
          disabled={isUpdating || seat.status === 'Broken'}
        >
          Mark Broken
        </button>
      </div>
      
      {isUpdating && <div className="loading-spinner">Updating...</div>}
    </div>
  );
}
```

### 5. App Initialization

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { initializeSocket } from './socket';
import { SeatCard } from './components/SeatCard';

function App() {
  useEffect(() => {
    // Initialize WebSocket connection
    const socket = initializeSocket();
    
    return () => {
      socket?.disconnect();
    };
  }, []);

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}

export default App;
```

## Key Points

### ✅ DO:
1. **Always use the latest version** from your state when making updates
2. **Update local state** when receiving 409 responses
3. **Listen to WebSocket events** and update state accordingly
4. **Show user-friendly notifications** when conflicts occur
5. **Use optimistic UI updates** with rollback on failure

### ❌ DON'T:
1. Don't cache version numbers in component state
2. Don't ignore 409 responses
3. Don't show generic error messages
4. Don't require manual page refresh
5. Don't make updates without checking current version

## Testing the Fix

### Test Scenario 1: Concurrent Updates
1. Open two browser windows
2. Both admins try to update the same seat simultaneously
3. **Expected:** One succeeds, one gets conflict notification
4. **Expected:** Conflicted admin's view updates automatically
5. **Expected:** Conflicted admin can immediately retry successfully

### Test Scenario 2: Sequential Updates After Conflict
1. Create a conflict (as above)
2. Wait for conflict notification
3. Try to update the same seat again
4. **Expected:** Update succeeds without error

### Test Scenario 3: WebSocket Updates
1. Admin A updates a seat
2. **Expected:** Admin B's view updates automatically
3. **Expected:** Admin B sees the new version number
4. Admin B updates the same seat
5. **Expected:** Update succeeds

## Debugging Tips

### Check Version Numbers
Add this to your component:
```typescript
console.log('Current seat version:', seat.version);
console.log('Version being sent:', currentSeat.version);
```

### Monitor WebSocket Events
```typescript
socket.on('seatUpdated', (seat) => {
  console.log('WebSocket update received:', {
    id: seat.id,
    version: seat.version,
    status: seat.status
  });
});
```

### Log API Responses
```typescript
console.log('API Response:', {
  status: response.status,
  conflict: response.status === 409,
  data: await response.json()
});
```

## Common Mistakes

### Mistake 1: Storing Version in Component State
```typescript
// ❌ BAD
const [version, setVersion] = useState(seat.version);

// ✅ GOOD
const currentSeat = useSeatStore.getState().getSeat(seatId);
const version = currentSeat.version;
```

### Mistake 2: Not Updating State on 409
```typescript
// ❌ BAD
if (response.status === 409) {
  alert('Conflict!');
  return;
}

// ✅ GOOD
if (response.status === 409) {
  const data = await response.json();
  if (data.currentSeat) {
    useSeatStore.getState().updateSeat(data.currentSeat);
  }
  toast.warning('Seat was modified. View updated.');
}
```

### Mistake 3: Ignoring WebSocket Updates
```typescript
// ❌ BAD
// No WebSocket listener

// ✅ GOOD
socket.on('seatUpdated', (seat) => {
  useSeatStore.getState().updateSeat(seat);
});
```

## Summary

The fix requires **both backend and frontend** working together:

**Backend (✅ Already Done):**
- Returns current seat data in 409 responses
- Emits WebSocket events on successful updates
- Uses optimistic locking with version in WHERE clause

**Frontend (⚠️ Needs Implementation):**
- Updates local state when receiving 409 responses
- Listens to WebSocket events and updates state
- Always uses latest version from state when making updates
- Shows user-friendly notifications

With this implementation, multiple admins can work simultaneously without persistent errors!
