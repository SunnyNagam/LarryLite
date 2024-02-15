import { GoogleGenerativeAI } from "@google/generative-ai";

const logElement = document.getElementById('log');
const loadingElement = document.getElementById('loading');
const startButton = document.getElementById('start');
const apiKeyInput = document.getElementById('apiKey');
const textInput = document.getElementById('textInput');
const submitTextButton = document.getElementById('submitText');

const triggerCommand = "hey larry"; 
let apiKey = "";
let listening = false;
let aborted = false;

function saveApiKey(apiKey) {
    localStorage.setItem('apiKey', apiKey);
}

function getStoredApiKey() {
    return localStorage.getItem('apiKey');
}

// Retrieve the API key from local storage and set it in the input field when the page loads
window.onload = function() {
    const storedApiKey = getStoredApiKey();
    if (storedApiKey) {
        apiKeyInput.value = storedApiKey;
    }
};

// Check if Speech API is supported
if (!('webkitSpeechRecognition' in window)) {
    logElement.innerText = "Sorry, your browser doesn't support the Web Speech API. Try using Chrome.";
} else {
    const recognition = new webkitSpeechRecognition();
    const synthesis = window.speechSynthesis;

    recognition.continuous = true; // Listen continuously
    recognition.interimResults = false; // We want interim results
    recognition.lang = 'en-US'; // Set language
    recognition.maxAlternatives = 1; // Get only one alternative

    startButton.onclick = function() {
        loadingElement.innerText = "Thinking...";
        loadingElement.classList.add('hidden');
        apiKey = apiKeyInput.value.trim(); // Get the API key from the input field
        if (!apiKey) {
            alert("Please enter your API key.");
            return;
        }

        saveApiKey(apiKey); // Save the API key to localStorage
        console.log("Starting recognition...");
        if(!listening) {
            listening = true;
            startButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            startButton.classList.add('bg-red-500', 'hover:bg-red-600');
            startButton.innerText = "Stop Listening";
            recognition.start();
            aborted = false;
        } else {
            listening = false;
            startButton.classList.remove('bg-red-500', 'hover:bg-red-600');
            startButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
            startButton.innerText = "Start Listening";
            recognition.abort();
            aborted = true;
        }
    };

    recognition.onresult = function(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript.trim();
                if (transcript.toLowerCase().startsWith(triggerCommand)) {
                    // Trigger detected, process the command
                    const commandText = transcript.slice(triggerCommand.length).trim();
                    loadingElement.classList.remove('hidden');
                    getGPTResponse(commandText).then(responseText => {
                        loadingElement.classList.add('hidden');
                        const utterance = new SpeechSynthesisUtterance(responseText);
                        utterance.rate = 1.33;
                        synthesis.speak(utterance);
                        appendToLog(triggerCommand + ' ' + commandText, responseText);
                    });
                }
            }
        }
    };

    recognition.onerror = function(event) {
        console.log(event);
        loadingElement.innerText = "Error: " + event.error;
        loadingElement.classList.remove('hidden');
    };

    recognition.onend = function() {
        if (!aborted) {
            recognition.start();
        }
    }
}

function setTimer(duration) {
    const synthesis = window.speechSynthesis;
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(`Your ${duration} minutes timer is finished.`);
        synthesis.speak(utterance);
    }, duration * 60 * 1000);
    const utterance = new SpeechSynthesisUtterance(`Timer of ${duration} minutes has been set.`);
    synthesis.speak(utterance);
}

// Submit button click handler
submitTextButton.addEventListener('click', async () => {
    const textPrompt = textInput.value.trim();
    if (!textPrompt) {
        alert("Please enter a prompt.");
        return;
    }

    textInput.value = ""; // Clear the input field after submission
    loadingElement.classList.remove('hidden');
    
    try {
        const responseText = await getGeminiResponse(textPrompt);
        loadingElement.classList.add('hidden');
        appendToLog("Text Prompt", responseText);
    } catch (error) {
        console.error(error);
        loadingElement.innerText = "Error: " + error.message;
        loadingElement.classList.remove('hidden');
    }
});

async function getGPTResponse(text) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    let model = "gpt-3.5-turbo";
    let body  = { model: model, temperature: 0.8 }
    //body.stream = true // todo figure out how to stream response 
    body.messages = [ { role: "user", content: "Keep your responses concise. "+text} ]
    body.functions = [
            {
                name: 'setTimer',
                description: 'Set a timer for a given duration',
                parameters: {
                    type: 'object',
                    properties: {
                        duration: { type: 'integer', description: 'The duration of the timer in minutes' },
                    },
                    required: ['duration'],
                },
            },
        ];

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log(data);

    const functionCall = data['choices'][0]['message']['function_call'];
    if (functionCall) {
        const functionName = functionCall['name'];
        const functionArgs = JSON.parse(functionCall['arguments']);

        let functionResponse;
        if (functionName === 'setTimer') {
            functionResponse = setTimer(functionArgs['duration']);
        }
    }
    return data.choices && data.choices[0] && data.choices[0].message.content.trim();
}

async function getGeminiResponse(text) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro"});

    const result = await geminiModel.generateContent(text);
    const response = await result.response;
    const textResp = response.text();
    console.log(response);
    return textResp;
}

function appendToLog(command, response) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'mb-2';

    const userLabel = document.createElement('div');
    userLabel.className = 'text-sm font-semibold mb-1';
    userLabel.innerText = 'You';

    const userMessage = document.createElement('div');
    userMessage.className = 'bg-blue-500 text-white rounded-lg py-1 px-3 inline-block';
    userMessage.innerText = command;

    const assistantLabel = document.createElement('div');
    assistantLabel.className = 'text-sm font-semibold mb-1 pt-1';
    assistantLabel.innerText = 'Assistant';

    const assistantMessage = document.createElement('div');
    assistantMessage.className = 'bg-gray-800 rounded-lg py-1 px-3 inline-block';
    assistantMessage.innerText = response;

    messageContainer.appendChild(userLabel);
    messageContainer.appendChild(userMessage);
    messageContainer.appendChild(assistantLabel);
    messageContainer.appendChild(assistantMessage);

    logElement.appendChild(messageContainer);
    logElement.scrollTop = logElement.scrollHeight; 
}
