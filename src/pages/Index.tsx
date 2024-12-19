import React, { useState } from "react";
import CameraFeed from "@/components/CameraFeed";
import ProfileSettings from "@/components/ProfileSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [profile, setProfile] = useState({
    name: "John Doe",
    phone: "+1234567890",
    language: "en",
  });

  const handleProfileUpdate = (newProfile: typeof profile) => {
    setProfile(newProfile);
    // Here you would typically send the language preference to your backend
    console.log("Language preference updated:", newProfile.language);
  };

  const handleFrame = (imageData: ImageData) => {
    // Here you would typically send the frame to your ML model
    // For now, we'll just log that we received a frame
    console.log("Received frame for processing");
  };

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary text-center mb-8">
          Vision Assistant
        </h1>

        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">Camera Feed</TabsTrigger>
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="mt-6">
            <CameraFeed onFrame={handleFrame} />
          </TabsContent>
          
          <TabsContent value="profile" className="mt-6">
            <ProfileSettings profile={profile} onUpdate={handleProfileUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;