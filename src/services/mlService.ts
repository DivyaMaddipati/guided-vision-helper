import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface NavigationInstruction {
  direction: 'left' | 'right' | 'center';
  message: string;
}

class MLService {
  private model: cocoSsd.ObjectDetection | null = null;

  async loadModel() {
    try {
      console.log('Loading COCO-SSD model...');
      this.model = await cocoSsd.load();
      console.log('Model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }

  async detectObjects(imageData: ImageData): Promise<Detection[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    try {
      const predictions = await this.model.detect(imageData);
      console.log('Detections:', predictions);
      return predictions as Detection[];
    } catch (error) {
      console.error('Error during detection:', error);
      return [];
    }
  }

  getNavigationInstructions(detections: Detection[], frameWidth: number): NavigationInstruction[] {
    const leftBoundary = frameWidth / 3;
    const rightBoundary = (2 * frameWidth) / 3;
    const instructions: NavigationInstruction[] = [];

    detections.forEach(detection => {
      const [x, , width] = detection.bbox;
      const objectCenterX = x + width / 2;

      if (objectCenterX < leftBoundary) {
        instructions.push({
          direction: 'left',
          message: 'Obstacle on the left, move to the center or right.'
        });
      } else if (objectCenterX > rightBoundary) {
        instructions.push({
          direction: 'right',
          message: 'Obstacle on the right, move to the center or left.'
        });
      } else {
        instructions.push({
          direction: 'center',
          message: 'Obstacle in the center, avoid or move left/right.'
        });
      }
    });

    return instructions;
  }
}

export const mlService = new MLService();