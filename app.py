from flask import Flask, render_template, request, redirect, url_for
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'

# Load your trained model
model = load_model(os.path.join(app.config['UPLOAD_FOLDER'], 'emotion_model.h5'))

# Emotion labels in the same order used during training
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
def predict_emotion(image_path):
    img = image.load_img(image_path, color_mode='grayscale', target_size=(48, 48))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # shape (1, 48, 48, 1)
    img_array /= 255.0  # normalize

    predictions = model.predict(img_array)
    predicted_index = np.argmax(predictions)
    predicted_emotion = emotion_labels[predicted_index]
    return predicted_emotion
@app.route("/", methods=["GET", "POST"])
def index():
    emotion = None
    image_url = None

    if request.method == "POST":
        file = request.files.get("image")
        if file and file.filename != '':
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            image_url = url_for('static', filename='../' + filepath)

            # Predict the emotion using the uploaded image
            emotion = predict_emotion(filepath)

    return render_template("index.html", emotion=emotion, image_url=image_url)
