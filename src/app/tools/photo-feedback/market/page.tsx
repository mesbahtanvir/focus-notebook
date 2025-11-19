"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebaseClient";
import { Loader2, Users, ArrowRight } from "lucide-react";

interface PublicSession {
  id: string;
  creatorName?: string;
  createdAt: string;
  photos: { id: string; url: string }[];
}

export default function VotingMarketPage() {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicSessions = async () => {
      try {
        const q = query(collection(db, "photoBattles"), where("isPublic", "==", true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(doc => doc.data() as PublicSession)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setSessions(data);
      } catch (error) {
        console.error("Failed to load public sessions", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPublicSessions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Photo Battle Market</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore public battles from other users and pick the strongest photos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No public sessions are available right now. Check back soon!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <Card key={session.id} className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-2 border-purple-100 dark:border-purple-900/40">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hosted by</p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {session.creatorName || "Anonymous"}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {session.photos.length} photo{session.photos.length === 1 ? "" : "s"} •
                    {" "}Created {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/tools/photo-feedback/session/${session.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
                >
                  Vote now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
