"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePhotoFeedback } from "@/store/usePhotoFeedback";
import { Upload, Image as ImageIcon, X, ArrowRight, Heart, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PhotoFeedbackPage() {
  const router = useRouter();
  const { createSession, isLoading } = usePhotoFeedback();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creatorName, setCreatorName] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Filter for images only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length + selectedFiles.length > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);

    // Create previews
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateSession = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one photo');
      return;
    }

    try {
      const { sessionId, secretKey } = await createSession(
        selectedFiles,
        creatorName.trim() || undefined
      );

      // Navigate to share page with session info
      router.push(`/tools/photo-feedback/share?sessionId=${sessionId}&secretKey=${secretKey}`);
    } catch (error) {
      alert('Failed to create session. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full">
              <Heart className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Dating Photo Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Get honest feedback from friends on which photos to use for your dating profile
          </p>
        </div>

        {/* How it works */}
        <Card className="p-6 mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Upload Photos</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add photos you&apos;re considering for your dating profile</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Share Link</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send the link to friends to vote (expires in 3 days)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">View Results</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">See which photos got the most positive feedback</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Upload Section */}
        <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Upload Your Photos</h2>

          {/* Optional Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g., Alex"
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This helps your friends know whose photos they&apos;re voting on
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label
              htmlFor="photo-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg cursor-pointer bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-purple-500 mb-3" />
                <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF up to 10 photos
                </p>
              </div>
              <input
                id="photo-upload"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Photo Previews */}
          {previews.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Selected Photos ({previews.length}/10)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Button */}
          <div className="mt-8">
            <button
              onClick={handleCreateSession}
              disabled={selectedFiles.length === 0 || isLoading}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  Create Feedback Session
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Privacy Notice */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>🔒 No login required • Links expire in 3 days • Photos are stored securely</p>
        </div>
      </div>
    </div>
  );
}
