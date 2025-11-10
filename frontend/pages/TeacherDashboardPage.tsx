import React, { useState } from "react";
import { Card, CardBody } from "@heroui/react";
import RoomSearchForm from "../components/teacher/RoomSearchForm";
import RoomRecommendationCard from "../components/teacher/RoomRecommendationCard";
import { SearchCriteria, RoomRecommendation } from "../types";
import { api } from "../services/apiService";
import { Spinner } from "../components/ui";
import { useBookingUpdates } from "../hooks/useBookingUpdates";
import { showErrorToast } from "../utils/toast";

const TeacherDashboardPage: React.FC = () => {
  const [searchResults, setSearchResults] = useState<RoomRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchCriteria, setLastSearchCriteria] =
    useState<SearchCriteria | null>(null);

  // Listen for booking changes to refresh room availability
  useBookingUpdates({
    onBookingCreated: () => {
      // Refresh search results if we have an active search
      if (lastSearchCriteria && hasSearched) {
        handleSearch(lastSearchCriteria);
      }
    },
    onBookingStatusChanged: () => {
      // Refresh search results if we have an active search
      if (lastSearchCriteria && hasSearched) {
        handleSearch(lastSearchCriteria);
      }
    },
    onBookingExpired: () => {
      // Refresh search results if we have an active search
      if (lastSearchCriteria && hasSearched) {
        handleSearch(lastSearchCriteria);
      }
    },
    onBookingCanceled: () => {
      // Refresh search results if we have an active search
      if (lastSearchCriteria && hasSearched) {
        handleSearch(lastSearchCriteria);
      }
    },
    onBookingConflict: (event) => {
      // Show error toast when booking conflict occurs
      if (event.conflictingBooking) {
        showErrorToast(
          new Error(event.message),
          `Room already booked by ${event.conflictingBooking.teacherName}`
        );
      } else {
        showErrorToast(new Error(event.message), "Booking Conflict");
      }

      // Refresh search results to show updated availability
      if (lastSearchCriteria && hasSearched) {
        handleSearch(lastSearchCriteria);
      }
    },
  });

  const handleSearch = async (criteria: SearchCriteria) => {
    setIsSearching(true);
    setSearchError("");
    setHasSearched(true);
    setLastSearchCriteria(criteria);

    try {
      const response = await api.searchRooms(criteria);
      setSearchResults(response.rooms);
    } catch (error) {
      const errorMsg = (error as Error).message;
      setSearchError(errorMsg);
      setSearchResults([]);
      showErrorToast(error, "Failed to search rooms");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookingCreated = () => {
    // Clear search results
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Find a Room</h1>
        <p className="text-default-600 mt-2">
          Search for available rooms based on your requirements and book them
          for your classes.
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardBody>
          <RoomSearchForm onSearch={handleSearch} loading={isSearching} />
        </CardBody>
      </Card>

      {/* Search Results */}
      {isSearching && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {searchError && (
        <Card className="border-danger">
          <CardBody>
            <p className="text-danger text-center">{searchError}</p>
          </CardBody>
        </Card>
      )}

      {!isSearching &&
        hasSearched &&
        searchResults.length === 0 &&
        !searchError && (
          <Card>
            <CardBody>
              <p className="text-default-600 text-center py-8">
                No rooms found matching your criteria. Try adjusting your search
                parameters.
              </p>
            </CardBody>
          </Card>
        )}

      {!isSearching && searchResults.length > 0 && lastSearchCriteria && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Recommended Rooms ({searchResults.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((recommendation) => (
              <RoomRecommendationCard
                key={recommendation.room.id}
                recommendation={recommendation}
                searchCriteria={lastSearchCriteria}
                onBookingCreated={handleBookingCreated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboardPage;
