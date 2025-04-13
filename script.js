// DOM elements
const cameraElement = document.getElementById('camera');
const canvasElement = document.getElementById('canvas');
const captureButton = document.getElementById('capture-btn');
const loadingElement = document.getElementById('loading');
const resultElement = document.getElementById('result');
const binTypeElement = document.getElementById('bin-type');
const binImageElement = document.getElementById('bin-image');
const explanationElement = document.getElementById('explanation');
const liveLabel = document.getElementById('live-label');

// Chat elements
const askQuestionBtn = document.getElementById('ask-question-btn');
const chatbotModal = document.getElementById('chatbot-modal');
const closeModalBtn = document.querySelector('.close-modal');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMessages = document.getElementById('chat-messages');

// OpenAI API key
const API_KEY = "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";

// Bin explanations for display at the bottom
// const binExplanations = {
//   recycling: 'Recyclable items include clean paper, cardboard, glass bottles, aluminum cans, and many plastics.',
//   compost: 'Compostable items include food scraps, yard waste, and other organic materials.',
//   landfill: 'Items that cannot be recycled or composted go to landfill.',
//   hazardous: 'Hazardous waste includes batteries, electronics, chemicals, and other potentially harmful materials.',
//   unknown: 'We couldn\'t identify this item. Please try again with a clearer image or consult your local waste management guidelines.'
// };

// Set up camera stream
async function setupCamera() {
  console.log("Setting up camera...");
  
  try {
    const constraints = { 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    };
    
    console.log("Requesting camera access with constraints:", constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log("Camera access granted, setting video source");
    cameraElement.srcObject = stream;
    
    return new Promise((resolve) => {
      cameraElement.onloadedmetadata = () => {
        console.log("Video metadata loaded");
        resolve(true);
      };
    });
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Error accessing camera: ' + error.message + '. Please make sure you have granted camera permissions.');
    return false;
  }
}

// Capture image from camera
function captureImage() {
  console.log("Capturing image...");
  console.log("Video dimensions:", cameraElement.videoWidth, "x", cameraElement.videoHeight);
  
  // Set canvas dimensions to match video
  canvasElement.width = cameraElement.videoWidth;
  canvasElement.height = cameraElement.videoHeight;
  
  // Draw current video frame to canvas
  const context = canvasElement.getContext('2d');
  context.drawImage(cameraElement, 0, 0, canvasElement.width, canvasElement.height);
  
  // Convert canvas to base64 image data
  const imageData = canvasElement.toDataURL('image/jpeg', 0.8);
  console.log("Image captured successfully");
  return imageData;
}

// Convert base64 to blob for API
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

// Process image through OpenAI API
async function processImage(imageDataUrl) {
  try {
    console.log("Processing image...");
    
    // Show loading indicator
    loadingElement.style.display = 'block';
    resultElement.style.display = 'none';
    
    // Convert base64 to blob
    const imageBlob = base64ToBlob(imageDataUrl);
    
    // Send to OpenAI API using fetch
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Identify all objects in this image that are waste items. For each object, tell me which bin it should go in.\n\nReply in this EXACT format for each item (without unknown objects):\n\nplastic cup: goes in the recycling bin\npaper wrapper: goes in the recycling bin\nbanana peel: goes in the compost bin\nplastic straw: goes in the landfill bin\nbattery: is hazardous waste\n\nIf you can't detect any waste objects, reply with:\nNo disposable objects detected.\n\nDo NOT include any items you can't identify or classify.\n\nBe concise. Use ONLY the format specified. Put EACH item on its own line. The items MUST be separated with line breaks." 
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      // If the API call failed, use a simulated response for testing
      console.warn("API call failed, using simulated response");
      const binType = simulateApiResponse();
      displayResult(binType);
      return;
    }
    
    const data = await response.json();
    const responseText = data.choices[0].message.content.trim();
    displayResult(responseText);
    
  } catch (error) {
    console.error('Error processing image:', error);
    alert('Error processing image: ' + error.message + '. Using simulated response instead.');
    
    // Use simulated response as fallback
    const binType = simulateApiResponse();
    displayResult(binType);
  }
}

// For fallback purposes - simulates API response
function simulateApiResponse() {
  const responses = [
    "plastic bottle: goes in the recycling bin\npaper wrapper: goes in the recycling bin",
    "banana peel: goes in the compost bin\ncoffee grounds: goes in the compost bin",
    "plastic straw: goes in the landfill bin\ndirty napkin: goes in the landfill bin",
    "battery: is hazardous waste\npaint can: is hazardous waste",
    "No disposable objects detected."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Display the result
function displayResult(responseText) {
  document.getElementById('fun-fact').textContent = ''; // Clear previous fun fact

  console.log("Displaying result:", responseText);
  
  // Hide loading and show result
  loadingElement.style.display = 'none';
  resultElement.style.display = 'block';
  
  // Clear previous content
  binTypeElement.style.display = 'none'; // Hide the bin type header
  explanationElement.innerHTML = '';
  
  // Check if no objects were detected
  if (responseText.includes('No disposable objects detected')) {
    explanationElement.innerHTML = '<div style="margin-bottom: 20px;">No disposable objects detected.</div>';
    // explanationElement.innerHTML += `<div class="bin-explanation">${binExplanations.unknown}</div>`;
    return;
  }
  
  // Split the response by newlines to get individual items
  const items = responseText.split('\n').filter(item => item.trim() !== '');
  const binTypes = new Set(); // Track which bin types we've seen
  
  // Create HTML for each item
  items.forEach(item => {
    if (item.trim() === '' || item.toLowerCase().includes('unknown')) return; // Skip empty lines and unknown items
    
    const itemElement = document.createElement('div');
    itemElement.style.marginBottom = '12px';
    itemElement.style.padding = '6px';
    itemElement.style.borderRadius = '4px';
    itemElement.style.fontWeight = '600';
    itemElement.style.textAlign = 'center';
    itemElement.style.fontSize = 22;
    
    // Track bin type
    let binType = 'unknown';
    
    // Set color based on bin type
    // if (item.includes('recycling')) {
    //   itemElement.style.color = '#2c8c44';
    //   itemElement.style.backgroundColor = '#f0f8f2';
    //   itemElement.style.border = '1px solid #d0e8d2';
    //   binType = 'recycling';
    // } else if (item.includes('compost')) {
    //   itemElement.style.color = '#8c7d2c';
    //   itemElement.style.backgroundColor = '#f8f7f0';
    //   itemElement.style.border = '1px solid #e8e2d0';
    //   binType = 'compost';
    // } else if (item.includes('landfill')) {
    //   itemElement.style.color = '#555';
    //   itemElement.style.backgroundColor = '#f5f5f5';
    //   itemElement.style.border = '1px solid #e0e0e0';
    //   binType = 'landfill';
    // } else if (item.includes('hazardous waste')) {
    //   itemElement.style.color = '#8c2c2c';
    //   itemElement.style.backgroundColor = '#f8f0f0';
    //   itemElement.style.border = '1px solid #e8d0d0';
    //   binType = 'hazardous';
    // } else {
    //   // Skip unknown items
    //   return;
    // }
    
    // Add bin type to our set
    binTypes.add(binType);
    
    itemElement.textContent = item;
explanationElement.appendChild(itemElement);

  });
  
  // Add general explanations based on the bin types we've seen
  const explanationsDiv = document.createElement('div');
  explanationsDiv.className = 'bin-explanations';
  explanationsDiv.style.marginTop = '20px';
  explanationsDiv.style.padding = '15px';
  explanationsDiv.style.backgroundColor = '#f9f9f9';
  explanationsDiv.style.borderRadius = '8px';
  explanationsDiv.style.border = '1px solid #eee';
  explanationsDiv.style.fontSize = '0.95rem';
  explanationsDiv.style.lineHeight = '1.6';
  
  // Add each explanation with spacing between them
  const relevantExplanations = [];
  
  if (binTypes.has('recycling')) {
    relevantExplanations.push(binExplanations.recycling);
  }
  
  if (binTypes.has('compost')) {
    relevantExplanations.push(binExplanations.compost);
  }
  
  if (binTypes.has('landfill')) {
    relevantExplanations.push(binExplanations.landfill);
  }
  
  if (binTypes.has('hazardous')) {
    relevantExplanations.push(binExplanations.hazardous);
  }
  
  // Join with spacing between paragraphs
  explanationsDiv.innerHTML = relevantExplanations.join('<br><br>');
  
  // Only add explanations div if we have explanations
  if (relevantExplanations.length > 0) {
    explanationElement.appendChild(explanationsDiv);
  }
  
  // If no valid items were found
  if (explanationElement.children.length === 0) {
    explanationElement.innerHTML = '';
    explanationElement.textContent = binExplanations.unknown;
  }

  // Collect object names
const objectNames = items.map(line => line.split(':')[0].trim()).join(', ');

// Generate a single combined fun fact
getFunFact(objectNames).then(fact => {
  if (fact) {
    const funFactEl = document.getElementById('fun-fact');
    funFactEl.textContent = `💡 Fun fact: ${fact}`;
  }
});

}

async function getFunFact(objectName) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Give me a fun environmental or recycling-related fact about a ${objectName}. Keep it to 1–2 sentences, playful and educational.`
          }
        ]
      })
    });

    if (!response.ok) {
      console.warn("Fun fact fetch failed.");
      return "";
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error getting fun fact:", error);
    return "";
  }
}

// Add a message to the chat (from user or bot)
function addChatMessage(message, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = isUser ? 'user-message' : 'bot-message';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  
  const iconElement = document.createElement('i');
  iconElement.className = isUser ? 'fas fa-user' : 'fas fa-robot';
  avatarDiv.appendChild(iconElement);
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message';
  messageContent.textContent = message;
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(messageContent);
  
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add a typing indicator while the bot is "thinking"
function addTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    typingDiv.appendChild(dot);
  }
  
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove the typing indicator
function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Process a chat question through the API
async function processChatQuestion(question) {
    try {
      addTypingIndicator();
      
      // Send to OpenAI API using fetch
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a specialized assistant that ONLY answers questions about recycling, waste management, composting, and sustainability. If the user asks a question that is NOT directly related to these topics, respond ONLY with: \"I'm only trained to help with recycling, waste management, and sustainability topics. Please ask me something related to these areas.\" Do not attempt to answer questions about other topics, even if you know the answer. For waste-related questions, provide accurate, concise information about proper waste disposal, recycling guidelines, composting, and reducing waste. If you're not sure about a specific local guideline, suggest that the user check with their local waste management authority."
            },
            {
              role: "user",
              content: question
            }
          ]
        })
      });
      
      removeTypingIndicator();
      
      if (!response.ok) {
        addChatMessage("I'm sorry, I'm having trouble connecting right now. Please try again later.");
        return;
      }
      
      const data = await response.json();
      const answer = data.choices[0].message.content.trim();
      addChatMessage(answer);
      
    } catch (error) {
      console.error('Error processing chat question:', error);
      removeTypingIndicator();
      addChatMessage("I'm sorry, I encountered an error. Please try again later.");
    }
  }

// Submit chat question
function submitChatQuestion() {
  const question = chatInput.value.trim();
  
  if (question === '') return;
  
  // Add user's question to chat
  addChatMessage(question, true);
  
  // Clear input
  chatInput.value = '';
  
  // Process question
  processChatQuestion(question);
}

// Initialize the app
async function init() {
  console.log("Initializing app...");
  
  // Set up chatbot modal events
  askQuestionBtn.addEventListener('click', () => {
    chatbotModal.style.display = 'block';
  });
  
  closeModalBtn.addEventListener('click', () => {
    chatbotModal.style.display = 'none';
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === chatbotModal) {
      chatbotModal.style.display = 'none';
    }
  });
  
  // Set up chat input events
  chatSendBtn.addEventListener('click', submitChatQuestion);
  
  chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      submitChatQuestion();
    }
  });
  
  // Disable capture button until camera is ready
  captureButton.disabled = true;
  
  const cameraReady = await setupCamera();
  
  if (cameraReady) {
    console.log("Camera is ready, enabling capture button");
    // Enable capture button
    captureButton.disabled = false;
    
    captureButton.addEventListener('click', async () => {
      console.log("Capture button clicked");
      const imageDataUrl = captureImage();
      
      // Process image and get bin classification
      await processImage(imageDataUrl);    
    });
  } else {
    console.log("Camera setup failed");
  }
}

// Start the app when page loads
console.log("Document loaded, initializing application");
document.addEventListener('DOMContentLoaded', init);