/* 
// DOM Elements
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const emotionText = document.getElementById('emotionText');
const confidenceValue = document.getElementById('confidenceValue');
const dominantEmotion = document.getElementById('dominantEmotion');
const emotionHistory = document.getElementById('emotionHistory');
const captureBtn = document.getElementById('captureBtn');
const startStopBtn = document.getElementById('startStopBtn');

// Chart instance
let emotionChart;

// Variables
let isDetecting = false;
let detectionInterval;
let historyItems = [];

// Initialize webcam
async function initWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcam.srcObject = stream;

    // Wait for video to be ready
    webcam.onloadedmetadata = () => {
      // Set canvas dimensions to match video
      canvas.width = webcam.videoWidth;
      canvas.height = webcam.videoHeight;

      // Enable capture button
      captureBtn.disabled = false;
      startStopBtn.disabled = false;
    };
  } catch (err) {
    console.error("Error accessing webcam:", err);
    alert("Could not access webcam. Please ensure you have granted camera permissions.");
  }
}

// Capture frame from webcam
function captureFrame() {
  ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

// Detect emotions from image
async function detectEmotions(imageUrl) {
  try {
    const response = await fetch('/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageUrl }),
    });

    const data = await response.json();

    if (data.success) {
      displayResults(data.emotion, data.probabilities);
      addToHistory(data.emotion, data.probabilities[data.emotion]);
    } else {
      console.error("Detection failed:", data.error);
      alert("Emotion detection failed. Please try again.");
    }
  } catch (err) {
    console.error("Error detecting emotions:", err);
  }
}

// Display detection results
function displayResults(emotion, probabilities) {
  // Show dominant emotion
  dominantEmotion.classList.remove('hidden');
  emotionText.textContent = emotion;

  // Format confidence percentage
  const confidence = Math.round(probabilities[emotion] * 100);
  confidenceValue.textContent = confidence;

  // Color based on emotion
  const emotionColors = {
    'Angry': 'text-red-500',
    'Disgust': 'text-green-600',
    'Fear': 'text-purple-500',
    'Happy': 'text-yellow-500',
    'Sad': 'text-blue-500',
    'Surprise': 'text-orange-500',
    'Neutral': 'text-gray-500'
  };

  emotionText.className = `text-4xl font-bold detected-emotion mb-4 ${emotionColors[emotion]}`;

  // Update chart
  updateChart(probabilities);
}

// Update emotion distribution chart
function updateChart(probabilities) {
  if (emotionChart) {
    emotionChart.destroy();
  }

  const ctx = document.getElementById('emotionChart').getContext('2d');

  // Format data for chart
  const labels = Object.keys(probabilities);
  const data = Object.values(probabilities);
  const backgroundColors = [
    'rgba(239, 68, 68, 0.7)',  // Angry - red
    'rgba(16, 185, 129, 0.7)', // Disgust - green
    'rgba(139, 92, 246, 0.7)', // Fear - purple
    'rgba(234, 179, 8, 0.7)',  // Happy - yellow
    'rgba(59, 130, 246, 0.7)', // Sad - blue
    'rgba(249, 115, 22, 0.7)', // Surprise - orange
    'rgba(107, 114, 128, 0.7)' // Neutral - gray
  ];

  emotionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Probability',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label}: ${Math.round(context.raw * 100)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            callback: function (value) {
              return `${Math.round(value * 100)}%`;
            }
          }
        }
      }
    }
  });
}

// Add detection to history
function addToHistory(emotion, confidence) {
  // Limit history to 10 items
  if (historyItems.length >= 10) {
    historyItems.shift();
  }

  historyItems.push({
    emotion,
    confidence,
    timestamp: new Date().toLocaleTimeString()
  });

  // Update UI
  renderHistory();
}

// Render emotion history
function renderHistory() {
  emotionHistory.innerHTML = '';

  historyItems.forEach((item, index) => {
    const emotionColors = {
      'Angry': 'bg-red-100 text-red-800',
      'Disgust': 'bg-green-100 text-green-800',
      'Fear': 'bg-purple-100 text-purple-800',
      'Happy': 'bg-yellow-100 text-yellow-800',
      'Sad': 'bg-blue-100 text-blue-800',
      'Surprise': 'bg-orange-100 text-orange-800',
      'Neutral': 'bg-gray-100 text-gray-800'
    };

    const emotionBadge = document.createElement('div');
    emotionBadge.className = `flex flex-col items-center justify-center p-3 rounded-lg min-w-[80px] ${emotionColors[item.emotion]}`;
    emotionBadge.innerHTML = `
                    <div class="font-bold">${item.emotion}</div>
                    <div class="text-xs">${Math.round(item.confidence * 100)}%</div>
                    <div class="text-xs text-gray-500 mt-1">${item.timestamp}</div>
                `;

    emotionHistory.appendChild(emotionBadge);
  });
}

// Event Listeners
document.getElementById('uploadBtn').addEventListener('click', handleFileUpload);

captureBtn.addEventListener('click', () => {
  const imageUrl = captureFrame();
  detectEmotions(imageUrl);
});

startStopBtn.addEventListener('click', () => {
  if (!isDetecting) {
    // Start detection
    isDetecting = true;
    startStopBtn.textContent = 'Stop Detection';
    startStopBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
    startStopBtn.classList.add('bg-red-600', 'hover:bg-red-700');

    // Run detection every 3 seconds
    detectionInterval = setInterval(() => {
      const imageUrl = captureFrame();
      detectEmotions(imageUrl);
    }, 3000);

    // Initial detection
    const imageUrl = captureFrame();
    detectEmotions(imageUrl);
  } else {
    // Stop detection
    isDetecting = false;
    startStopBtn.textContent = 'Start Detection';
    startStopBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
    startStopBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    clearInterval(detectionInterval);
  }
});

// Handle file upload
function handleFileUpload() {
  const fileInput = document.getElementById('fileInput');
  fileInput.click();

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('imagePreviewContainer').classList.remove('hidden');
      const previewImg = document.getElementById('uploadedImagePreview');
      previewImg.src = event.target.result;

      detectEmotions(event.target.result);
    };
    reader.readAsDataURL(file);
  });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initWebcam();

  // Initialize empty chart
  updateChart({
    'Angry': 0,
    'Disgust': 0,
    'Fear': 0,
    'Happy': 0,
    'Sad': 0,
    'Surprise': 0,
    'Neutral': 0
  });
});
const historyContainer = document.getElementById("emotionHistory");
const newEmotion = "{{ emotion }}";

if (newEmotion) {
  const tag = document.createElement("div");
  tag.className = "px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium animate-fade-in";
  tag.textContent = newEmotion;
  historyContainer.prepend(tag);
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
  .animate - fade -in {
  animation: fadeIn 0.4s ease- out;
  }

function previewImage(event) {
  const input = event.target;
  const preview = document.getElementById('imagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}
function previewImage(event) {
  const input = event.target;
  const preview = document.getElementById('imagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
} */