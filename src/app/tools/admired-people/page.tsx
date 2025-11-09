"use client";

import { useState, useMemo, useEffect } from "react";
import { useAdmiredPeople, AdmiredPerson } from "@/store/useAdmiredPeople";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import { AdmiredPersonCard } from "@/components/AdmiredPersonCard";
import { AdmiredPersonModal } from "@/components/AdmiredPersonModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  Sparkles,
  Plus,
  UserX
} from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";

export default function AdmiredPeoplePage() {
  useTrackToolUsage('admired-people');

  const { user } = useAuth();
  const people = useAdmiredPeople((s) => s.people);
  const subscribe = useAdmiredPeople((s) => s.subscribe);
  const addPerson = useAdmiredPeople((s) => s.add);
  const updatePerson = useAdmiredPeople((s) => s.update);
  const deletePerson = useAdmiredPeople((s) => s.delete);

  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<AdmiredPerson | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; id: string; name: string}>({show: false, id: '', name: ''});

  const theme = toolThemes.purple;

  // Subscribe to Firebase
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    people.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [people]);

  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [people, searchQuery, filterCategory]);

  const stats = useMemo(() => {
    return {
      total: people.length,
      enriched: people.filter(p => p.aiEnriched).length,
      categories: categories.length,
    };
  }, [people, categories]);

  const handleEdit = (person: AdmiredPerson) => {
    setEditingPerson(person);
    setShowModal(true);
  };

  const handleDelete = (person: AdmiredPerson) => {
    setDeleteConfirm({show: true, id: person.id, name: person.name});
  };

  const confirmDelete = async () => {
    await deletePerson(deleteConfirm.id);
    setDeleteConfirm({show: false, id: '', name: ''});
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="People I Admire"
        emoji="✨"
        subtitle="Learn from inspiring people • Understand their perspectives • Get inspired"
        showBackButton
        stats={[
          { label: 'total', value: stats.total, variant: 'info' },
          { label: 'categories', value: stats.categories, variant: 'success' }
        ]}
        theme={theme}
        action={{
          label: 'Add Person',
          icon: Sparkles,
          onClick: () => {
            setEditingPerson(null);
            setShowModal(true);
          }
        }}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name..."
        totalCount={people.length}
        filteredCount={filteredPeople.length}
        theme={theme}
        showFilterToggle={categories.length > 0}
        filterContent={
          categories.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input py-1 text-sm min-w-[150px]"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* People List */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No admired people added yet
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">
            Add people who inspire you and learn from their perspectives
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Person
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredPeople.map((person) => (
              <AdmiredPersonCard
                key={person.id}
                person={person}
                onEdit={() => handleEdit(person)}
                onDelete={() => handleDelete(person)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Person Modal */}
      {showModal && (
        <AdmiredPersonModal
          person={editingPerson}
          onClose={() => {
            setShowModal(false);
            setEditingPerson(null);
          }}
          onSave={async (data) => {
            if (editingPerson) {
              await updatePerson(editingPerson.id, data);
            } else {
              await addPerson(data);
            }
            setShowModal(false);
            setEditingPerson(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({show: false, id: '', name: ''})}
        title={`Remove ${deleteConfirm.name}?`}
        message="This will remove this person from your list."
        confirmText="Remove"
        cancelText="Keep"
        variant="warning"
        icon={<UserX className="h-8 w-8" />}
      />
    </ToolPageLayout>
  );
}
