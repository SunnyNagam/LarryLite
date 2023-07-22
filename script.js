const logElement = document.getElementById('log');
const startButton = document.getElementById('start');
const apiKeyInput = document.getElementById('apiKey'); // Get the input element for API key
const triggerCommand = "hey larry"; // You can modify this to your preferred trigger
let apiKey = ""

function saveApiKey(apiKey) {
    localStorage.setItem('apiKey', apiKey);
}

function getStoredApiKey() {
    return localStorage.getItem('apiKey');
}

function appendToLog(command, response) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'mb-4';
    
    const commandElement = document.createElement('div');
    commandElement.className = 'text-right text-green-600';
    commandElement.innerText = command;
    
    const responseElement = document.createElement('div');
    responseElement.className = 'text-left text-blue-600';
    responseElement.innerText = response;
    
    messageContainer.appendChild(commandElement);
    messageContainer.appendChild(responseElement);
    
    logElement.appendChild(messageContainer);
    logElement.scrollTop = logElement.scrollHeight; // Scroll to the bottom to see the latest message
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
    recognition.interimResults = true; // We want interim results
    recognition.lang = 'en-US'; // Set language

    startButton.onclick = function() {
        apiKey = apiKeyInput.value.trim(); // Get the API key from the input field
        if (!apiKey) {
            alert("Please enter your API key.");
            return;
        }

        saveApiKey(apiKey); // Save the API key to localStorage
        recognition.start();
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
        logElement.innerText = `Error: ${event.error}`;
    };
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
    return data.choices && data.choices[0] && data.choices[0].message.content.trim();
}
