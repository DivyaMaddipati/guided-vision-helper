import React, { useRef, useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraFeedProps {
  onFrame: (imageData: ImageData) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onFrame }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        toast.success("Camera started successfully");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Failed to access camera");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      toast.info("Camera stopped");
    }
  };

  useEffect(() => {
    let animationFrame: number;

    const processFrame = () => {
      if (videoRef.current && canvasRef.current && isStreaming) {
        const context = canvasRef.current.getContext("2d");
        if (context) {
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          onFrame(imageData);
        }
        animationFrame = requestAnimationFrame(processFrame);
      }
    };

    if (isStreaming) {
      animationFrame = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isStreaming, onFrame]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          width={640}
          height={480}
        />
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <Button
          onClick={isStreaming ? stopCamera : startCamera}
          className={`${
            isStreaming ? "bg-alert hover:bg-alert/90" : "bg-accent hover:bg-accent/90"
          } transition-colors`}
        >
          <Camera className="mr-2 h-4 w-4" />
          {isStreaming ? "Stop Camera" : "Start Camera"}
        </Button>
      </div>
    </div>
  );
};

export default CameraFeed;