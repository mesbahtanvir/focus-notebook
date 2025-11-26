import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Task } from "@/store/useTasks";

interface TodaysAgendaProps {
  tasks: Task[];
}

export default function TodaysAgenda({ tasks }: TodaysAgendaProps) {
  // Filter tasks with due date = today (proper date comparison)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const todaysTasks = tasks.filter((task) => {
    if (task.done || !task.dueDate) return false;

    const dueDate = new Date(task.dueDate);
    return dueDate >= todayStart && dueDate <= todayEnd;
  });

  if (todaysTasks.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="border-4 border-green-200 shadow-xl bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-green-950">
        <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-b-4 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-md">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-green-700 dark:text-green-300">
                Today&apos;s Agenda
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {todaysTasks.length} task{todaysTasks.length !== 1 ? "s" : ""} due today
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {todaysTasks.slice(0, 5).map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.category && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          task.category === "mastery"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}
                      >
                        {task.category}
                      </span>
                    )}
                    {task.estimatedMinutes && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.estimatedMinutes}min
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {todaysTasks.length > 5 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                +{todaysTasks.length - 5} more task{todaysTasks.length - 5 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
