import React, { useRef, useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mlService, type Detection, type NavigationInstruction } from "@/services/mlService";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CameraFeedProps {
  onFrame?: (imageData: ImageData) => void;
  language?: string;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onFrame, language = 'en' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [instructions, setInstructions] = useState<NavigationInstruction[]>([]);

  useEffect(() => {
    const loadModel = async () => {
      const success = await mlService.loadModel();
      if (success) {
        setIsModelLoaded(true);
        toast.success("ML model loaded successfully");
      } else {
        toast.error("Failed to load ML model");
      }
    };

    loadModel();
  }, []);

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
      setDetections([]);
      setInstructions([]);
      toast.info("Camera stopped");
    }
  };

  useEffect(() => {
    let animationFrame: number;

    const processFrame = async () => {
      if (videoRef.current && canvasRef.current && isStreaming && isModelLoaded) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          // Draw video frame to canvas
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Get image data for processing
          const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Process frame with ML model
          const newDetections = await mlService.detectObjects(imageData);
          setDetections(newDetections);
          
          // Get navigation instructions
          const newInstructions = mlService.getNavigationInstructions(newDetections, canvasRef.current.width);
          setInstructions(newInstructions);

          // Draw detections
          newDetections.forEach(detection => {
            const [x, y, width, height] = detection.bbox;
            context.strokeStyle = '#00FF00';
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);
            context.fillStyle = '#00FF00';
            context.fillText(
              `${detection.class} (${Math.round(detection.score * 100)}%)`,
              x,
              y > 10 ? y - 5 : 10
            );
          });

          // Draw region divisions
          const leftBoundary = canvasRef.current.width / 3;
          const rightBoundary = (2 * canvasRef.current.width) / 3;
          context.strokeStyle = '#0000FF';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(leftBoundary, 0);
          context.lineTo(leftBoundary, canvasRef.current.height);
          context.moveTo(rightBoundary, 0);
          context.lineTo(rightBoundary, canvasRef.current.height);
          context.stroke();

          if (onFrame) {
            onFrame(imageData);
          }
        }
        animationFrame = requestAnimationFrame(processFrame);
      }
    };

    if (isStreaming && isModelLoaded) {
      animationFrame = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isStreaming, isModelLoaded, onFrame]);

  return (
    <div className="relative w-full max-w-2xl mx-auto space-y-4">
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

      <div className="flex justify-center gap-4">
        <Button
          onClick={isStreaming ? stopCamera : startCamera}
          disabled={!isModelLoaded}
          className={`${
            isStreaming ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          } transition-colors`}
        >
          <Camera className="mr-2 h-4 w-4" />
          {isStreaming ? "Stop Camera" : "Start Camera"}
        </Button>
      </div>

      {instructions.length > 0 && (
        <div className="space-y-2">
          {instructions.map((instruction, index) => (
            <Alert key={index}>
              <AlertDescription>{instruction.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraFeed;