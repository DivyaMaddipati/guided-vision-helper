from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import threading
from playsound import playsound

app = Flask(__name__)
# Enable CORS for all domains
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Load YOLOv8 model
model = YOLO("yolov8n.pt")

def play_sound(direction, language="en"):
    """Play a sound alert for the given direction."""
    # In a production environment, you would have different language sound files
    sounds = {
        "left": "audio/left_instruction.mp3",
        "right": "audio/right_instruction.mp3",
        "center": "audio/center_instruction.mp3"
    }
    if direction in sounds:
        threading.Thread(target=playsound, args=(sounds[direction],)).start()

@app.route('/api/detect', methods=['POST'])
def detect_objects():
    try:
        # Get the image data from the request
        data = request.json
        image_data = data['image']
        language = data.get('language', 'en')
        
        # Decode base64 image
        encoded_data = image_data.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        frame_height, frame_width, _ = frame.shape
        
        # Define regions
        left_boundary = frame_width // 3
        right_boundary = 2 * frame_width // 3
        
        # Perform detection
        results = model(frame)
        
        detections = []
        instructions = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                
                object_center_x = (x1 + x2) // 2
                
                detection = {
                    'bbox': [x1, y1, x2 - x1, y2 - y1],
                    'class': class_name,
                    'score': confidence
                }
                detections.append(detection)
                
                # Generate instructions based on position
                if object_center_x < left_boundary:
                    instruction = {
                        'message': f"Obstacle on the left, move to the center or right.",
                        'direction': 'left'
                    }
                elif object_center_x > right_boundary:
                    instruction = {
                        'message': f"Obstacle on the right, move to the center or left.",
                        'direction': 'right'
                    }
                else:
                    instruction = {
                        'message': f"Obstacle in the center, avoid or move left/right.",
                        'direction': 'center'
                    }
                instructions.append(instruction)
                
                # Play sound based on direction (in production, this would be language-specific)
                play_sound(instruction['direction'], language)
        
        return jsonify({
            'success': True,
            'detections': detections,
            'instructions': instructions
        })
        
    except Exception as e:
        print(f"Error in detect_objects: {str(e)}")  # Add logging
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/update-language', methods=['POST'])
def update_language():
    try:
        data = request.json
        language = data.get('language', 'en')
        # Here you would typically update the language preference in your database
        return jsonify({
            'success': True,
            'message': f'Language updated to {language}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
