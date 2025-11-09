"use client";

import { useState, useMemo, useEffect } from "react";
import { usePlaces, Place, PlaceType } from "@/store/usePlaces";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import { PlaceCard } from "@/components/PlaceCard";
import { PlaceModal } from "@/components/PlaceModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  MapPin,
  Plus,
  Trash2
} from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";

export default function PlacesPage() {
  useTrackToolUsage('places');

  const { user } = useAuth();
  const places = usePlaces((s) => s.places);
  const subscribe = usePlaces((s) => s.subscribe);
  const addPlace = usePlaces((s) => s.add);
  const updatePlace = usePlaces((s) => s.update);
  const deletePlace = usePlaces((s) => s.delete);

  const [showModal, setShowModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PlaceType | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; id: string; name: string}>({show: false, id: '', name: ''});

  const theme = toolThemes.blue;

  // Subscribe to Firebase
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const filteredPlaces = useMemo(() => {
    return places.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== 'all' && p.type !== filterType) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [places, searchQuery, filterType]);

  const stats = useMemo(() => {
    return {
      total: places.length,
      live: places.filter(p => p.type === 'live').length,
      visit: places.filter(p => p.type === 'visit').length,
      shortTerm: places.filter(p => p.type === 'short-term').length,
      enriched: places.filter(p => p.aiEnriched).length,
    };
  }, [places]);

  const handleEdit = (place: Place) => {
    setEditingPlace(place);
    setShowModal(true);
  };

  const handleDelete = (place: Place) => {
    setDeleteConfirm({show: true, id: place.id, name: place.name});
  };

  const confirmDelete = async () => {
    await deletePlace(deleteConfirm.id);
    setDeleteConfirm({show: false, id: '', name: ''});
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Places"
        emoji="🗺️"
        subtitle="Track places to live, visit, or stay • Compare destinations • Plan your next move"
        showBackButton
        stats={[
          { label: 'to live', value: stats.live, variant: 'success' },
          { label: 'to visit', value: stats.visit, variant: 'info' },
          { label: 'short-term', value: stats.shortTerm, variant: 'warning' }
        ]}
        theme={theme}
        action={{
          label: 'Add Place',
          icon: MapPin,
          onClick: () => {
            setEditingPlace(null);
            setShowModal(true);
          }
        }}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search places..."
        totalCount={places.length}
        filteredCount={filteredPlaces.length}
        theme={theme}
        showFilterToggle
        filterContent={
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as PlaceType | 'all')}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="live">🏡 Want to Live</option>
                <option value="visit">✈️ Want to Visit</option>
                <option value="short-term">🏨 Short-term Stay</option>
              </select>
            </div>
          </div>
        }
      />

      {/* Places List */}
      {filteredPlaces.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No places added yet
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">
            Add places you want to explore and compare them
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Place
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onEdit={() => handleEdit(place)}
                onDelete={() => handleDelete(place)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Place Modal */}
      {showModal && (
        <PlaceModal
          place={editingPlace}
          onClose={() => {
            setShowModal(false);
            setEditingPlace(null);
          }}
          onSave={async (data) => {
            if (editingPlace) {
              await updatePlace(editingPlace.id, data);
            } else {
              await addPlace(data);
            }
            setShowModal(false);
            setEditingPlace(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({show: false, id: '', name: ''})}
        title={`Remove ${deleteConfirm.name}?`}
        message="This will remove this place from your list."
        confirmText="Remove"
        cancelText="Keep"
        variant="warning"
        icon={<Trash2 className="h-8 w-8" />}
      />
    </ToolPageLayout>
  );
}
