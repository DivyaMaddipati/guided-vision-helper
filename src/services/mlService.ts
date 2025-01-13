import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { toast } from "sonner";

export interface Detection {
  bbox: number[];
  class: string;
  score: number;
  position?: string;
}

export interface NavigationInstruction {
  message: string;
  direction: string;
  object_type: string;
  confidence?: number;
  count?: number;
}

class MLService {
  private model: cocoSsd.ObjectDetection | null = null;
  private apiUrl = 'http://localhost:5000/api';
  private lastInstructionTime: { [key: string]: number } = {};
  private instructionCooldown = 3000; // 3 seconds cooldown between same instructions

  async loadModel(): Promise<boolean> {
    try {
      console.log('Initializing TensorFlow backend...');
      await tf.ready();
      await tf.setBackend('webgl');
      console.log('TensorFlow backend initialized:', tf.getBackend());
      
      console.log('Loading COCO-SSD model...');
      this.model = await cocoSsd.load();
      console.log('Model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      toast.error('Failed to load ML model');
      return false;
    }
  }

  async detectObjects(imageData: ImageData): Promise<Detection[]> {
    try {
      console.log('Converting image data to base64...');
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.putImageData(imageData, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg');
      console.log('Image converted successfully');

      console.log('Sending request to backend...');
      const response = await fetch(`${this.apiUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          language: localStorage.getItem('language') || 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      console.log('Received detections from backend:', data.detections);
      return data.detections;
    } catch (error) {
      console.error('Error detecting objects:', error);
      toast.error('Failed to process image');
      return [];
    }
  }

  getNavigationInstructions(detections: Detection[], frameWidth: number): NavigationInstruction[] {
    const currentTime = Date.now();
    const instructions: NavigationInstruction[] = [];
    
    detections.forEach(detection => {
      const instructionKey = `${detection.class}_${detection.position}`;
      
      // Check if enough time has passed since the last similar instruction
      if (!this.lastInstructionTime[instructionKey] || 
          currentTime - this.lastInstructionTime[instructionKey] >= this.instructionCooldown) {
        
        const instruction: NavigationInstruction = {
          message: `${detection.class} detected ${detection.position}`,
          direction: detection.position || 'unknown',
          object_type: detection.class,
          confidence: detection.score
        };
        
        instructions.push(instruction);
        this.lastInstructionTime[instructionKey] = currentTime;
      }
    });
    
    return instructions;
  }
}

export const mlService = new MLService();