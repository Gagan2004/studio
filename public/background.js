
// Form AutoPilot - background.js

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVaultData") {
    chrome.storage.local.get('formAutoPilotVaults', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting vaults:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      const vaults = result.formAutoPilotVaults || [];
      const defaultVault = vaults.find(v => v.isDefault) || (vaults.length > 0 ? vaults[0] : null);
      sendResponse({ data: defaultVault ? defaultVault.data : null });
    });
    return true; // Indicates that the response will be sent asynchronously
  }

  if (request.action === "callAiMapFields") {
    const { userData, formFields } = request.payload;
    // Ensure your Genkit dev server is running, typically on port 4000 or 3400
    // The flow name `mapFormFieldsFlow` should match what Genkit exposes.
    // You might need to adjust the URL if Genkit exposes it differently.
    const genkitDevServerUrl = 'http://localhost:4000/mapFormFieldsFlow'; // Adjust port if needed

    fetch(genkitDevServerUrl, { // Make sure this matches your genkit flow's endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userData, formFields }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
        // The Genkit flow might return the output directly or nested.
        // Assuming data is the direct output array.
        sendResponse({ success: true, mappings: data });
    })
    .catch(error => {
      console.error('Error calling AI flow:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Indicates that the response will be sent asynchronously
  }

  // Listener for autofill request from popup
  if (request.action === "autofillActiveTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "triggerAutofill" }, (response) => {
          if (chrome.runtime.lastError) {
            // console.warn("Could not send message to content script:", chrome.runtime.lastError.message);
            // This can happen if the content script isn't loaded on the page (e.g. chrome:// pages)
            sendResponse({ success: false, error: "Could not connect to content script on active page."});
          } else if (response && response.status) {
            sendResponse(response); // Forward response from content script
          } else {
            sendResponse({ success: false, error: "No response or unexpected response from content script." });
          }
        });
      } else {
        sendResponse({ success: false, error: "No active tab found." });
      }
    });
    return true; // Indicates asynchronous response
  }
});

console.log("Form AutoPilot background service worker started.");

// You'll need to create actual icon files in public/icons/
// For example: public/icons/icon16.png, icon48.png, icon128.png
// You can use placeholders like https://placehold.co/16x16.png for testing.
