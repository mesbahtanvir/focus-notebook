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
import { UserIcon } from "lucide-react";

type ProfileForm = {
  fullName: string;
  email: string;
  bio: string;
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
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
        const saved = localStorage.getItem("profile");
        const defaultValues = {
          email: user.email || "",
          fullName: user.displayName || "",
          bio: "",
        };
        
        if (saved) {
          const data = JSON.parse(saved) as ProfileForm;
          setUserData({ ...defaultValues, ...data });
        } else {
          setUserData(defaultValues);
        }
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
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>Sign in to access your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">Sign in to view and manage your profile information.</p>
            <div className="pt-4">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="relative">
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              try {
                await signOut();
                toast({
                  title: "Signed out",
                  description: "You have been signed out successfully.",
                });
              } catch (error) {
                console.error("Error signing out:", error);
                toast({
                  title: "Error",
                  description: "Failed to sign out. Please try again.",
                  variant: "destructive",
                });
              }
            }}
          >
            Sign Out
          </Button>
        </div>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Basic information about you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Full Name</Label>
            <div className="text-sm">{userData.fullName || "Not provided"}</div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <div className="text-sm">{userData.email || "Not provided"}</div>
          </div>

          {userData.bio && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bio</Label>
              <div className="text-sm whitespace-pre-line">{userData.bio}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
