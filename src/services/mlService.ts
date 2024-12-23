import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { toast } from "sonner";

export interface Detection {
  bbox: number[];
  class: string;
  score: number;
}

export interface NavigationInstruction {
  message: string;
  direction: string;
}

class MLService {
  private model: cocoSsd.ObjectDetection | null = null;
  private apiUrl = 'http://localhost:5000/api';

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
      toast.error('Failed to process image. Is the backend server running?');
      return [];
    }
  }

  getNavigationInstructions(detections: Detection[], frameWidth: number): NavigationInstruction[] {
    const leftBoundary = frameWidth / 3;
    const rightBoundary = (2 * frameWidth) / 3;
    
    const instructions: NavigationInstruction[] = [];
    
    detections.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      const objectCenterX = x + width / 2;
      
      if (objectCenterX < leftBoundary) {
        instructions.push({
          message: `${detection.class} on the left, move to the center or right.`,
          direction: 'left'
        });
      } else if (objectCenterX > rightBoundary) {
        instructions.push({
          message: `${detection.class} on the right, move to the center or left.`,
          direction: 'right'
        });
      } else {
        instructions.push({
          message: `${detection.class} in the center, avoid or move left/right.`,
          direction: 'center'
        });
      }
    });
    
    return instructions;
  }
}

export const mlService = new MLService();