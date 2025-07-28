from flask import Flask, render_template, request
from werkzeug.utils import secure_filename
from pymongo import MongoClient
import os
import numpy as np
from datetime import datetime
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import cloudinary
import cloudinary.uploader

from dotenv import load_dotenv


# Load environment variables from .env
load_dotenv()


# Flask setup
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# MongoDB Atlas connection
MONGODB_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGODB_URI)
db = client['facial_emotion_db']
collection = db['predictions']

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv('CLOUD_NAME'),
    api_key=os.getenv('API_KEY'),
    api_secret=os.getenv('API_SECRET')
)

# Load model from models folder (only this line changed)
model = load_model(os.path.join('uploads', 'emotion_model.h5'))
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

def predict_emotion(image_path):
    img = image.load_img(image_path, target_size=(96, 96))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0
    predictions = model.predict(img_array)
    predicted_index = np.argmax(predictions)
    return emotion_labels[predicted_index]

@app.route("/", methods=["GET", "POST"])
def index():
    emotion = None
    image_url = None

    if request.method == "POST":
        file = request.files.get("image")
        if file and file.filename:
            filename = secure_filename(file.filename)
            local_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(local_path)

            # Step 1: Predict emotion
            emotion = predict_emotion(local_path)

            # Step 2: Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(local_path)
            image_url = upload_result.get("secure_url")

            # Step 3: Save to MongoDB
            collection.insert_one({
                "cloudinary_url": image_url,
                "emotion": emotion,
                "timestamp": datetime.now()
            })

            # Step 4: Delete local image after uploading
            os.remove(local_path)

    # Step 5: Get latest 5 predictions
    history = list(
        collection.find({"cloudinary_url": {"$exists": True}}).sort("timestamp", -1).limit(6)
    )

    # Ensure cloudinary_url fallback
    for item in history:
        item["image_url"] = item.get("cloudinary_url", "")
        item["timestamp"] = item.get("timestamp", datetime.now())

    return render_template("index.html", emotion=emotion, image_url=image_url, history=history)

if __name__ == "__main__":
    print("App started")
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))
