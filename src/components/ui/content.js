
// Form AutoPilot - content.js

function extractFormFieldsForAI() {
  const forms = document.querySelectorAll('form');
  const allFields = [];
  forms.forEach(form => {
    const formElements = form.elements;
    for (let i = 0; i < formElements.length; i++) {
      const element = formElements[i];
      if (element.name && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
        // Basic field extraction, can be made more sophisticated
        let labelText = '';
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) {
            labelText = labelElement.textContent.trim();
          }
        }
        if (!labelText && element.closest('label')) {
            labelText = element.closest('label').textContent.trim();
        }
        if (!labelText && element.placeholder) {
            labelText = element.placeholder; // Fallback to placeholder
        }

        allFields.push({
          name: element.name,
          label: labelText || element.ariaLabel,
          placeholder: element.placeholder,
          type: element.type,
          // id: element.id, // useful for debugging, but AI primarily uses name
        });
      }
    }
  });
  return allFields;
}

function fillFormFields(mappings) {
  let fieldsFilled = 0;
  mappings.forEach(mapping => {
    const fieldElement = document.getElementsByName(mapping.fieldName)[0];
    if (fieldElement && (fieldElement.tagName === 'INPUT' || fieldElement.tagName === 'TEXTAREA' || fieldElement.tagName === 'SELECT')) {
      fieldElement.value = mapping.value;
      // Trigger change event for React/Vue forms
      const event = new Event('input', { bubbles: true });
      fieldElement.dispatchEvent(event);
      fieldsFilled++;
    }
  });
  return fieldsFilled;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "triggerAutofill") {
    const extractedFields = extractFormFieldsForAI();
    if (extractedFields.length === 0) {
      sendResponse({ status: "error", message: "No form fields found on this page." });
      return;
    }

    // 1. Get user data from the default vault (via background script)
    chrome.runtime.sendMessage({ action: "getVaultData" }, (vaultResponse) => {
      if (chrome.runtime.lastError || !vaultResponse || !vaultResponse.data) {
        sendResponse({ status: "error", message: "Could not retrieve vault data." });
        return;
      }
      const userData = vaultResponse.data;

      // 2. Call AI to map fields (via background script)
      const aiInput = {
        userData: Object.entries(userData)
          .filter(([_, value]) => typeof value === 'string')
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {}),
        formFields: extractedFields.map(f => ({
          name: f.name,
          label: f.label,
          placeholder: f.placeholder,
          type: f.type,
        })),
      };

      chrome.runtime.sendMessage({ action: "callAiMapFields", payload: aiInput }, (aiResponse) => {
        if (chrome.runtime.lastError || !aiResponse || !aiResponse.success) {
          sendResponse({ status: "error", message: `AI mapping failed: ${aiResponse ? aiResponse.error : 'Unknown error'}` });
          return;
        }
        
        const mappings = aiResponse.mappings;
        if (mappings && mappings.length > 0) {
          const numFilled = fillFormFields(mappings);
          sendResponse({ status: "success", message: `${numFilled} field(s) autofilled.` });
        } else {
          sendResponse({ status: "info", message: "AI found no confident mappings." });
        }
      });
    });
    return true; // Indicates asynchronous response
  }
});

console.log("Form AutoPilot content script loaded.");
