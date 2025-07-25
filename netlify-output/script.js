// DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const resultContent = document.getElementById('resultContent');
const spinner = document.getElementById('spinner');
const btnText = document.querySelector('.btn-text');

// API endpoint
const API_URL = 'https://medicines-conflicts-finder.663px1b9l.workers.dev';

// Current selected file
let selectedFile = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // File input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Click to upload - only on the upload area, not the button
    uploadArea.addEventListener('click', (event) => {
        // Don't trigger if clicking on the button
        if (!event.target.closest('.upload-btn')) {
            imageInput.click();
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        selectedFile = file;
        displayPreview(file);
    } else {
        showError('אנא בחר קובץ תמונה תקין.');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            selectedFile = file;
            displayPreview(file);
        } else {
            showError('אנא שחרר קובץ תמונה תקין.');
        }
    }
}

function displayPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewSection.style.display = 'block';
        resultsSection.style.display = 'none';
        
        // Scroll to preview section
        previewSection.scrollIntoView({ behavior: 'smooth' });
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    selectedFile = null;
    imageInput.value = '';
    previewSection.style.display = 'none';
    resultsSection.style.display = 'none';
    resultContent.innerHTML = '';
    resultContent.className = 'result-content';
}

async function analyzeImage() {
    if (!selectedFile) {
        showError('אנא בחר תמונה תחילה.');
        return;
    }

    // Show loading state
    setLoadingState(true);
    
    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`שגיאת HTTP! סטטוס: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayResults(data.content);
        
    } catch (error) {
        console.error('שגיאה בניתוח התמונה:', error);
        showError(`נכשל בניתוח התמונה: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    if (loading) {
        analyzeBtn.disabled = true;
        spinner.style.display = 'block';
        btnText.textContent = 'מנתח...';
    } else {
        analyzeBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'נתח תמונה';
    }
}

function displayResults(content) {
    // Convert markdown to HTML using marked.js
    const htmlContent = marked.parse(content);
    
    resultContent.innerHTML = `
        <p><strong>תוצאת הניתוח:</strong></p>
        <div class="analysis-content">${htmlContent}</div>
    `;
    resultContent.className = 'result-content success';
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showError(message) {
    resultContent.innerHTML = `
        <p><strong>שגיאה:</strong></p>
        <p>${message}</p>
    `;
    resultContent.className = 'result-content error';
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Add some visual feedback for better UX
uploadArea.addEventListener('mouseenter', () => {
    if (!selectedFile) {
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.backgroundColor = '#f8f9ff';
    }
});

uploadArea.addEventListener('mouseleave', () => {
    if (!selectedFile) {
        uploadArea.style.borderColor = '#e1e5e9';
        uploadArea.style.backgroundColor = '#fafbfc';
    }
}); 