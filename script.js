// DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const fileInfo = document.getElementById('fileInfo');
const fileSize = document.getElementById('fileSize');
const fileResolution = document.getElementById('fileResolution');
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

// Function to compress image
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            alert('img.onload');
            // Calculate new dimensions while maintaining aspect ratio
            const maxWidth = 1920;
            const maxHeight = 1080;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw the image on canvas
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob with compression
            canvas.toBlob((blob) => {
                if (blob) {
                    // Create a new file with compressed data
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                } else {
                    reject(new Error('Failed to compress image'));
                }
            }, 'image/jpeg', 0.8); // 80% quality
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
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
            processImageFile(file);
        } else {
            showError('אנא שחרר קובץ תמונה תקין.');
        }
    }
}

async function processImageFile(file) {
    try {
        // Check file size first
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showError(`הקובץ גדול מדי. גודל מקסימלי: 10MB. גודל נוכחי: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return;
        }
        
        // Compress the image
        const compressedFile = await compressImage(file);
        selectedFile = compressedFile;
        displayPreview(compressedFile);
        
        // Show compression info if significant
        const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
        if (compressionRatio > 10) {
            console.log(`Image compressed by ${compressionRatio}%`);
        }
        
    } catch (error) {
        console.error('Error processing image:', error);
        showError('שגיאה בעיבוד התמונה. אנא נסה שוב.');
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
    fileInfo.style.display = 'none';
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
            let errorMessage = `שגיאת HTTP! סטטוס: ${response.status}`;
            
            // Try to get more detailed error information
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (parseError) {
                console.log('Could not parse error response:', parseError);
            }
            
            // Handle specific error cases
            if (response.status === 413) {
                errorMessage = 'התמונה גדולה מדי. אנא השתמש בתמונה קטנה יותר או דחוס יותר.';
            } else if (response.status === 429) {
                errorMessage = 'יותר מדי בקשות. אנא המתן מעט ונסה שוב.';
            } else if (response.status === 405) {
                errorMessage = 'שגיאת שיטת בקשה. אנא נסה שוב.';
            } else if (response.status === 400) {
                errorMessage = errorMessage || 'שגיאה בבקשה. אנא בדוק את התמונה ונסה שוב.';
            } else if (response.status >= 500) {
                errorMessage = 'שגיאת שרת. אנא נסה שוב מאוחר יותר.';
            }
            
            console.error('HTTP Error Details:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                errorMessage: errorMessage
            });
            
            throw new Error(errorMessage);
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