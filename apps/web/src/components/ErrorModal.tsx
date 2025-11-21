"use client";

import { AlertCircle, X, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { ModalPortal } from "@/components/ui/modal-portal";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  showSettingsButton?: boolean;
}

export function ErrorModal({ 
  isOpen, 
  onClose, 
  title = "Error", 
  message,
  showSettingsButton = false 
}: ErrorModalProps) {
  const router = useRouter();

  const handleGoToSettings = () => {
    onClose();
    router.push('/settings');
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <ModalPortal.Backdrop onClick={onClose} opacity={60} />

        <ModalPortal.Content className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-4 border-red-200 dark:border-red-800 max-w-md w-full overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/50 dark:to-orange-900/50 border-b-4 border-red-300 dark:border-red-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-full">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    {title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {message}
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold transition-colors"
                >
                  Close
                </button>
                {showSettingsButton && (
                  <button
                    onClick={handleGoToSettings}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                )}
              </div>
            </div>
          </ModalPortal.Content>
        </div>
      </ModalPortal>
  );
}
