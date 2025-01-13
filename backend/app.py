from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import threading
import pyttsx3
from queue import Queue
import torch
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from transformers import AutoModelForCausalLM, AutoTokenizer
from gtts import gTTS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize models
yolo_model = YOLO("yolov8n.pt")
person_detector = fasterrcnn_resnet50_fpn(pretrained=True)
person_detector.eval()

# Voice feedback queue
voice_queue = Queue()

def speak_worker():
    engine = pyttsx3.init()
    engine.setProperty('rate', 235)
    engine.setProperty('volume', 1.0)
    
    while True:
        if not voice_queue.empty():
            text = voice_queue.get()
            engine.say(text)
            engine.runAndWait()
            with voice_queue.mutex:
                voice_queue.queue.clear()

# Start voice feedback thread
voice_thread = threading.Thread(target=speak_worker, daemon=True)
voice_thread.start()

def get_position(frame_width, x_center):
    if x_center < frame_width / 3:
        return "left"
    elif x_center < 2 * frame_width / 3:
        return "center"
    else:
        return "right"

@app.route('/api/detect', methods=['POST'])
def detect_objects():
    try:
        data = request.json
        image_data = data['image']
        language = data.get('language', 'en')
        
        # Decode base64 image
        encoded_data = image_data.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        frame_height, frame_width, _ = frame.shape
        
        # YOLO detection
        results = yolo_model(frame)
        
        detections = []
        instructions = []
        person_count = 0
        
        # Process each detection
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = yolo_model.names[class_id]
                
                # Calculate center position
                x_center = (x1 + x2) / 2
                position = get_position(frame_width, x_center)
                
                detection = {
                    'bbox': [x1, y1, x2 - x1, y2 - y1],
                    'class': class_name,
                    'score': confidence,
                    'position': position
                }
                detections.append(detection)
                
                # Generate instruction
                instruction = {
                    'message': f"{class_name} detected {position}",
                    'direction': position,
                    'object_type': class_name,
                    'confidence': confidence
                }
                instructions.append(instruction)
                
                # Count persons
                if class_name.lower() == 'person':
                    person_count += 1
                
                # Add to voice queue
                voice_text = f"{class_name} detected {position}"
                voice_queue.put(voice_text)
        
        # Add person count instruction if persons detected
        if person_count > 0:
            instructions.append({
                'message': f"Total persons detected: {person_count}",
                'direction': 'info',
                'object_type': 'person_count',
                'count': person_count
            })
        
        return jsonify({
            'success': True,
            'detections': detections,
            'instructions': instructions,
            'person_count': person_count
        })
        
    except Exception as e:
        print(f"Error in detect_objects: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)