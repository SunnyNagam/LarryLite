const logElement = document.getElementById('log');
const startButton = document.getElementById('start');
const apiKeyInput = document.getElementById('apiKey'); // Get the input element for API key
const triggerCommand = "hey larry"; // You can modify this to your preferred trigger
let apiKey = "";
let listening = false;

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
        apiKey = apiKeyInput.value.trim(); // Get the API key from the input field
        if (!apiKey) {
            alert("Please enter your API key.");
            return;
        }

        saveApiKey(apiKey); // Save the API key to localStorage
        console.log("Starting recognition...");
        if(!listening) {
            listening = true;
            startButton.innerText = "Stop Listening";
            recognition.start();
        } else {
            listening = false;
            startButton.innerText = "Start Listening";
            recognition.abort();
        }
    };

    recognition.onresult = function(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript.trim();
                if (transcript.toLowerCase().startsWith(triggerCommand)) {
                    // Trigger detected, process the command
                    const commandText = transcript.slice(triggerCommand.length).trim();
                    getGPTResponse(commandText).then(responseText => {
                        // Speak the response
                        const utterance = new SpeechSynthesisUtterance(responseText);
                        synthesis.speak(utterance);

                        // Append the command and response to the log
                        appendToLog(triggerCommand + ' ' + commandText, responseText);
                    });
                }
            }
        }
    };

    recognition.onerror = function(event) {
        console.log(event);
        alert(`Error: ${event.error}`);
    };
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

async function getGPTResponse(text) {
    // Call the chatGPT API
    // Note: Since this example is client-side only, there are security concerns regarding API key exposure.
    // Ideally, you'd use server-side code to make this request.
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    //const apiKey = 2; // DO NOT expose this in production on client-side
    let model = "gpt-3.5-turbo";
    let body  = { model: model, temperature: 0.8 }
    //body.stream = true 
    body.messages = [ { role: "user", content: text} ]
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
    logElement.scrollTop = logElement.scrollHeight; // Scroll to the bottom to see the latest message
}
