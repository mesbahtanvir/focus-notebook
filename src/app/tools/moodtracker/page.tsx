"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMoods } from "@/store/useMoods";
import MoodTracker from "@/components/MoodTracker";

export default function MoodTrackerPage() {
  const moods = useMoods((s) => s.moods);
  const addMood = useMoods((s) => s.add);

  const [value, setValue] = useState(5);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  const recent = useMemo(() => moods.slice(0, 5), [moods]);

  const save = async () => {
    setSaving(true);
    await addMood({ value, note, createdAt: new Date().toISOString() });
    setSaving(false);
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 500);
    setNote("");
  };
  return <MoodTracker />;

  // return (
  //   <div className="container mx-auto py-8">
  //     <Card>
  //       <CardHeader>
  //         <CardTitle>Mood Tracker</CardTitle>
  //         <CardDescription>Log your mood from 1 to 10 with an optional note</CardDescription>
  //       </CardHeader>
  //       <CardContent className="space-y-6">
  //         <div className="space-y-3">
  //           <label className="text-sm">Mood: {value}</label>
  //           <motion.input
  //             type="range"
  //             min={1}
  //             max={10}
  //             value={value}
  //             onChange={(e) => setValue(Number(e.target.value))}
  //             className="w-full"
  //             whileTap={{ scale: 0.98 }}
  //           />
  //         </div>

  //         <div className="space-y-2">
  //           <label className="text-sm" htmlFor="note">Note (optional)</label>
  //           <textarea
  //             id="note"
  //             className="input w-full min-h-[100px]"
  //             placeholder="What's affecting your mood?"
  //             value={note}
  //             onChange={(e) => setNote(e.target.value)}
  //           />
  //         </div>

  //         <div className="flex items-center gap-3">
  //           <Button onClick={save} disabled={saving}>
  //             {saving ? 'Saving…' : 'Save'}
  //           </Button>
  //           <Button variant="secondary" onClick={() => window.location.assign('/tools/moodtracker#history')}>View History</Button>
  //           <AnimatePresence>
  //             {savedPulse && (
  //               <motion.span
  //                 initial={{ opacity: 0, scale: 0.9 }}
  //                 animate={{ opacity: 1, scale: 1 }}
  //                 exit={{ opacity: 0 }}
  //                 transition={{ duration: 0.35 }}
  //                 className="text-sm text-green-600"
  //               >
  //                 Saved!
  //               </motion.span>
  //             )}
  //           </AnimatePresence>
  //         </div>

  //         <div id="history" className="space-y-3">
  //           <h3 className="text-lg font-medium">Recent</h3>
  //           {recent.length === 0 ? (
  //             <p className="text-muted-foreground">No entries yet</p>
  //           ) : (
  //             <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
  //               {recent.map((m) => (
  //                 <motion.div
  //                   key={m.id}
  //                   initial={{ opacity: 0, y: 6 }}
  //                   animate={{ opacity: 1, y: 0 }}
  //                   className="card p-4 border"
  //                 >
  //                   <div className="font-medium">Mood: {m.value}/10</div>
  //                   {m.note && <div className="text-sm text-muted-foreground mt-1">{m.note}</div>}
  //                   <div className="text-xs text-muted-foreground mt-2">{new Date(m.createdAt).toLocaleString()}</div>
  //                 </motion.div>
  //               ))}
  //             </div>
  //           )}
  //         </div>
  //       </CardContent>
  //     </Card>
  //   </div>
  // );
}
