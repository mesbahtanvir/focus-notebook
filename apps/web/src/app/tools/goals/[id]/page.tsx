"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { useThoughts } from "@/store/useThoughts";
import { useEntityGraph } from "@/store/useEntityGraph";
import { Target } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GoalFormModal } from "@/components/GoalFormModal";
import { GoalHeader } from "@/components/goal/GoalHeader";
import { GoalStatistics } from "@/components/goal/GoalStatistics";
import { GoalProjectLinks } from "@/components/goal/GoalProjectLinks";
import { GoalThoughtLinks } from "@/components/goal/GoalThoughtLinks";
import { GoalBrainstorming } from "@/components/goal/GoalBrainstorming";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const goalId = params.id as string;

  const goals = useGoals((s) => s.goals);
  const subscribe = useGoals((s) => s.subscribe);
  const updateGoal = useGoals((s) => s.updateGoal);
  const deleteGoal = useGoals((s) => s.deleteGoal);

  const projects = useProjects((s) => s.projects);
  const subscribeProjects = useProjects((s) => s.subscribe);
  const getProjectsByGoal = useProjects((s) => s.getProjectsByGoal);
  const addProject = useProjects((s) => s.add);
  const updateProject = useProjects((s) => s.update);

  const thoughts = useThoughts((s) => s.thoughts);
  const subscribeThoughts = useThoughts((s) => s.subscribe);
  const addThought = useThoughts((s) => s.add);
  const subscribeRelationships = useEntityGraph((s) => s.subscribe);
  const createRelationship = useEntityGraph((s) => s.createRelationship);
  const relationships = useEntityGraph((s) => s.relationships);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const goal = goals.find(g => g.id === goalId);
  const linkedProjects = getProjectsByGoal(goalId);
  const relationshipLinkedThoughts = useMemo(() => {
    const thoughtMap = new Map(thoughts.map((t) => [t.id, t]));
    const relevant = relationships.filter(
      (rel) =>
        rel.status === 'active' &&
        rel.sourceType === 'thought' &&
        rel.targetType === 'goal' &&
        rel.targetId === goalId
    );
    return relevant
      .map((rel) => thoughtMap.get(rel.sourceId))
      .filter((thought): thought is typeof thoughts[number] => Boolean(thought));
  }, [relationships, thoughts, goalId]);

  const linkedThoughts = useMemo(() => {
    if (relationshipLinkedThoughts.length > 0) {
      return relationshipLinkedThoughts;
    }
    return thoughts.filter((thought) => thought.tags?.includes(goalId));
  }, [relationshipLinkedThoughts, thoughts, goalId]);

  const linkedThoughtIds = useMemo(() => linkedThoughts.map((t) => t.id), [linkedThoughts]);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
      subscribeProjects(user.uid);
      subscribeThoughts(user.uid);
      subscribeRelationships(user.uid);
    }
  }, [user?.uid, subscribe, subscribeProjects, subscribeThoughts, subscribeRelationships]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = async (data: {
    title: string;
    objective: string;
    timeframe: 'immediate' | 'short-term' | 'long-term';
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }) => {
    if (goal) {
      await updateGoal(goal.id, data);
    }
    setIsEditModalOpen(false);
  };

  const handleDelete = async () => {
    if (goal) {
      await deleteGoal(goal.id);
      router.push('/tools/goals');
    }
    setShowDeleteConfirm(false);
  };

  const handleLinkProjects = async (projectIds: string[]) => {
    for (const projectId of projectIds) {
      await updateProject(projectId, { goalId: goalId });
    }
  };

  const handleCreateProject = async (data: {
    title: string;
    objective: string;
    category: 'health' | 'wealth' | 'mastery' | 'connection';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    timeframe: 'short-term' | 'long-term';
  }) => {
    await addProject({
      ...data,
      status: 'active',
      goalId: goalId,
      actionPlan: [],
    });
  };

  const handleLinkThoughts = async (thoughtIds: string[]) => {
    for (const thoughtId of thoughtIds) {
      await createRelationship({
        sourceType: 'thought',
        sourceId: thoughtId,
        targetType: 'goal',
        targetId: goalId,
        relationshipType: 'linked-to',
        strength: 100,
        createdBy: 'user',
        reasoning: `Linked via goal detail UI`,
      });
    }
  };

  const handleCreateThought = async (text: string) => {
    const createdThoughtId = await addThought({
      text,
      tags: [],
    });

    if (createdThoughtId) {
      await createRelationship({
        sourceType: 'thought',
        sourceId: createdThoughtId,
        targetType: 'goal',
        targetId: goalId,
        relationshipType: 'linked-to',
        strength: 100,
        createdBy: 'user',
        reasoning: 'Created from goal detail',
      });
    }
  };

  if (!goal) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Goal Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The goal you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <button
            onClick={() => router.push("/tools/goals")}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Back to Goals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <GoalHeader
        goal={goal}
        onEdit={handleEdit}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Statistics Cards */}
      <GoalStatistics
        goal={goal}
        projectCount={linkedProjects.length}
        thoughtCount={linkedThoughts.length}
      />

      {/* Split Layout: Projects (Left) and Thoughts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Projects */}
        <div className="space-y-6">
          <GoalProjectLinks
            goalId={goalId}
            linkedProjects={linkedProjects}
            allProjects={projects}
            onLinkProjects={handleLinkProjects}
            onCreateProject={handleCreateProject}
          />
        </div>

        {/* Right Side - Thoughts & Brainstorming */}
        <div className="space-y-6">
          <GoalThoughtLinks
            goalId={goalId}
            linkedThoughts={linkedThoughts}
            allThoughts={thoughts}
            onLinkThoughts={handleLinkThoughts}
            onCreateThought={handleCreateThought}
            linkedThoughtIds={linkedThoughtIds}
          />

          <GoalBrainstorming goal={goal} userId={user?.uid} />
        </div>
      </div>

      {/* Modals */}
      <GoalFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSubmitEdit}
        editingGoal={goal}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Goal"
        message={`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
