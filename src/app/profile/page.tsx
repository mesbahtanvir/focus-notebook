"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { UserIcon, LogOut, Mail, User, Edit, Shield, AlertTriangle } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";

type ProfileForm = {
  fullName: string;
  email: string;
  bio: string;
};

export default function ProfilePage() {
  const { user, loading: authLoading, isAnonymous } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<ProfileForm>({
    fullName: user?.displayName || "",
    email: user?.email || "",
    bio: "",
  });

  useEffect(() => {
    if (!authLoading && user) {
      try {
        // Always use the authenticated user's email and displayName
        const saved = localStorage.getItem("profile");
        let bio = "";
        
        if (saved) {
          try {
            const data = JSON.parse(saved) as ProfileForm;
            // Only use bio from saved data, always override name/email with current user
            bio = data.bio || "";
          } catch (parseError) {
            console.error("Failed to parse saved profile:", parseError);
          }
        }
        
        // Always set current user's data
        setUserData({
          email: user.email || "",
          fullName: user.displayName || "",
          bio: bio,
        });
      } catch (e) {
        console.error("Failed to load profile:", e);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, authLoading, toast]);

  const onSubmit = (data: ProfileForm) => {
    if (!user) return;
    
    try {
      localStorage.setItem("profile", JSON.stringify(data));
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (e) {
      console.error("Failed to save profile:", e);
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
          <CardHeader className="text-center bg-gradient-to-r from-purple-100 to-pink-100 border-b-4 border-purple-200">
            <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <UserIcon className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Welcome! 👋</CardTitle>
            <CardDescription className="text-gray-600 font-medium">Sign in to access your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center p-8">
            <p className="text-gray-600">Sign in to view and manage your profile information.</p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Shield className="h-5 w-5" />
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Profile Header Card */}
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 border-b-4 border-purple-200 relative">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-24 h-24 rounded-full ring-4 ring-purple-400 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-2 shadow-lg">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                {userData.fullName || "User"}
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {userData.email || "No email provided"}
              </CardDescription>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                  toast({
                    title: "Signed out",
                    description: "You have been signed out successfully.",
                  });
                  window.location.href = '/login';
                } catch (error) {
                  console.error("Error signing out:", error);
                  toast({
                    title: "Error",
                    description: "Failed to sign out. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          {/* Anonymous Account Warning */}
          {isAnonymous && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                    Temporary Account Active
                  </h3>
                  <p className="text-xs text-yellow-800 mb-3">
                    Your data is saved locally but may be lost if you clear your browser or use a different device. 
                    <Link href="/login" className="underline font-semibold hover:no-underline ml-1">
                      Create a permanent account
                    </Link> to keep your data forever.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Bio Section */}
          {userData.bio && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <Label className="text-lg font-bold text-purple-600 flex items-center gap-2 mb-3">
                <Edit className="h-5 w-5" />
                Bio
              </Label>
              <div className="text-gray-700 whitespace-pre-line">{userData.bio}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
