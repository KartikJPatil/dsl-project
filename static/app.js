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
    
    // File upload elements
    const fileInput = document.getElementById("file-input");
    const fileDropZone = document.getElementById("file-drop-zone");
    const browseBtn = document.getElementById("browse-btn");
    const fileInfo = document.getElementById("file-info");
    const fileName = document.getElementById("file-name");
    const removeFileBtn = document.getElementById("remove-file");
    
    let currentFile = null;
  
    // File upload functionality
    function handleFile(file) {
      if (!file) return;
      
      // Validate file type
      const allowedTypes = ['.txt', '.pdf', '.docx', '.doc'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        showError('Please select a valid file type (.txt, .pdf, .docx, or .doc)');
        return;
      }
      
      // Validate file size (16MB max)
      if (file.size > 16 * 1024 * 1024) {
        showError('File size must be less than 16MB');
        return;
      }
      
      currentFile = file;
      fileName.textContent = file.name;
      fileInfo.style.display = 'block';
      
      // Upload and extract text
      uploadAndExtractText(file);
    }
    
    function uploadAndExtractText(file) {
      const formData = new FormData();
      formData.append('file', file);
      
      // Show loading state
      const originalContent = fileDropZone.innerHTML;
      fileDropZone.innerHTML = `
        <div class="text-center">
          <div class="spinner-border text-primary mb-3" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-white-75">Processing file...</p>
        </div>
      `;
      
      fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          inputText.value = data.text;
          updateCharacterCount();
          showSuccess(`File processed successfully! Extracted ${data.text_length} characters.`);
        } else {
          showError(data.error || 'Failed to process file');
          removeCurrentFile();
        }
      })
      .catch(error => {
        console.error('Upload error:', error);
        showError('Error uploading file. Please try again.');
        removeCurrentFile();
      })
      .finally(() => {
        fileDropZone.innerHTML = originalContent;
        // Re-attach event listeners
        attachFileUploadListeners();
      });
    }
    
    function removeCurrentFile() {
      currentFile = null;
      fileInfo.style.display = 'none';
      fileName.textContent = '';
      fileInput.value = '';
    }
    
    function showError(message) {
      // Create a temporary error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger mt-3';
      errorDiv.textContent = message;
      fileDropZone.parentNode.appendChild(errorDiv);
      
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
    
    function showSuccess(message) {
      // Create a temporary success message
      const successDiv = document.createElement('div');
      successDiv.className = 'alert alert-success mt-3';
      successDiv.textContent = message;
      fileDropZone.parentNode.appendChild(successDiv);
      
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    }
    
    function attachFileUploadListeners() {
      // Remove existing listeners first to avoid duplicates
      const newBrowseBtn = document.getElementById("browse-btn");
      const newFileInput = document.getElementById("file-input");
      const newFileDropZone = document.getElementById("file-drop-zone");
      const newRemoveFileBtn = document.getElementById("remove-file");
      
      // Browse button click
      newBrowseBtn.addEventListener('click', () => {
        newFileInput.click();
      });
      
      // File input change
      newFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFile(e.target.files[0]);
        }
      });
      
      // Drop zone click
      newFileDropZone.addEventListener('click', (e) => {
        if (e.target === newFileDropZone || e.target.closest('.file-upload-content')) {
          newFileInput.click();
        }
      });
      
      // Drag and drop
      newFileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        newFileDropZone.classList.add('drag-over');
      });
      
      newFileDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        newFileDropZone.classList.remove('drag-over');
      });
      
      newFileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        newFileDropZone.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
      
      // Remove file button
      newRemoveFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCurrentFile();
      });
    }
    
    // Initialize file upload listeners
    attachFileUploadListeners();
    
    // Update the character count and toggle analyze button
    function updateCharacterCount() {
      const len = inputText.value.trim().length;
      charCount.textContent = `${len} / 20000`;
      analyzeBtn.disabled = len === 0;
      if (!resultDisplay.classList.contains("d-none")) {
        resultDisplay.classList.add("d-none");
      }
    }
    
    inputText.addEventListener("input", updateCharacterCount);

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