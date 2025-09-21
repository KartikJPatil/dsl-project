document.addEventListener("DOMContentLoaded", () => {
    const inputText = document.getElementById("input-text");
    const analyzeBtn = document.getElementById("analyze-btn");
    const charCount = document.getElementById("char-count");
    const resultDisplay = document.getElementById("result-display");
    const resultTitle = document.getElementById("result-title");
    const resultIcon = document.getElementById("result-icon");
    const resultMessage = document.getElementById("result-message");
    const resultConfidence = document.getElementById("result-confidence");
    const form = document.getElementById("analysis-form");
    const copyBtn = document.getElementById("copy-btn");
  
    // Update the character count and toggle analyze button
    inputText.addEventListener("input", () => {
      const len = inputText.value.trim().length;
      charCount.textContent = `${len} / 5000`;
      analyzeBtn.disabled = len === 0;
      if (!resultDisplay.classList.contains("d-none")) {
        resultDisplay.classList.add("d-none");
      }
    });

    // Copy text to clipboard
    copyBtn.addEventListener("click", () => {
      inputText.select();
      inputText.setSelectionRange(0, 99999); // For mobile devices
      document.execCommand("copy");
      
      const originalIcon = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
      }, 2000);
    });
  
    // Animate icons on display
    function animateIcon(iconElem, isAI) {
      iconElem.classList.remove("rotate-positive", "rotate-negative");
      // Add subtle rotation animation depending on AI or human
      setTimeout(() => {
        iconElem.classList.add(isAI ? "rotate-negative" : "rotate-positive");
      }, 10);
    }
  
    // Submit form handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      analyzeBtn.disabled = true;
      resultDisplay.classList.add("d-none");
      resultMessage.textContent = "Analyzing...";
      resultMessage.className = "alert alert-info text-center";
      resultConfidence.textContent = "";
  
      try {
        const response = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText.value.trim() }),
        });
  
        const data = await response.json();
        analyzeBtn.disabled = false;
  
        if (data.success) {
          const isAI = data.result.prediction === "AI-generated";
          const confidence = Math.round(data.result.probability * 100);
          const crit = data.result.crit !== null ? data.result.crit.toFixed(3) : "N/A";
          const tokens = data.result.ntoken || "N/A";
  
          resultTitle.textContent = isAI ? "AI-Generated Text Detected" : "Likely Human-Written Text";
  
          resultIcon.innerHTML = isAI
            ? '<i class="fas fa-robot text-danger"></i>'
            : '<i class="fas fa-user text-success"></i>';
          animateIcon(resultIcon.firstElementChild, isAI);
  
          resultMessage.innerHTML = `
            <p>${isAI ? "The text is likely AI-generated." : "The text appears to be human-written."}</p>
          `;
  
          resultConfidence.innerHTML = `
            <p><strong>Confidence:</strong> ${confidence}%</p>
            <p><strong>Detection Metric (crit):</strong> ${crit}</p>
            <p><strong>Number of Tokens:</strong> ${tokens}</p>
          `;
  
          resultMessage.className = isAI ? "alert alert-danger" : "alert alert-success";
  
          resultDisplay.classList.remove("d-none");
          
          // Smoothly scroll to the result section
          resultDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
        } else {
          resultMessage.textContent = data.error || "Failed to analyze text.";
          resultMessage.className = "alert alert-warning";
          resultConfidence.textContent = "";
          resultDisplay.classList.remove("d-none");
          
          // Smoothly scroll to the result section
          resultDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (error) {
        analyzeBtn.disabled = false;
        resultMessage.textContent = "Error connecting to the server. Please try again later.";
        resultMessage.className = "alert alert-danger";
        resultConfidence.textContent = "";
        resultDisplay.classList.remove("d-none");
        
        // Smoothly scroll to the result section
        resultDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });