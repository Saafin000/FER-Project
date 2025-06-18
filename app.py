from flask import Flask, render_template, request, url_for, send_from_directory
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Load the model
model = load_model(os.path.join(app.config['UPLOAD_FOLDER'], 'emotion_model.h5'))

# Labels
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

def predict_emotion(image_path):
    # Load image as RGB and resize to 96x96
    img = image.load_img(image_path, target_size=(96, 96))  # default is RGB
    img_array = image.img_to_array(img)  # shape (96, 96, 3)
    img_array = np.expand_dims(img_array, axis=0)  # shape (1, 96, 96, 3)
    img_array /= 255.0  # normalize

    predictions = model.predict(img_array)
    predicted_index = np.argmax(predictions)
    return emotion_labels[predicted_index]

@app.route("/", methods=["GET", "POST"])
def index():
    emotion = None
    filename = None

    if request.method == "POST":
        file = request.files.get("image")
        if file and file.filename:
            filename = file.filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            emotion = predict_emotion(filepath)

    return render_template("index.html", emotion=emotion, filename=filename)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == "__main__":
    app.run(debug=True)
