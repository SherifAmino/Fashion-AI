/* ─── FashionAI Virtual Try-On Client ──────────────────────────── */

const TryOnModule = (() => {
  let personImage = null;
  let selectedGarmentId = null;
  let isProcessing = false;

  const DOM = {
    uploadZone: () => document.getElementById('upload-zone'),
    photoInput: () => document.getElementById('photo-input'),
    qualityIndicator: () => document.getElementById('quality-indicator'),
    garmentGrid: () => document.getElementById('garment-grid'),
    processButton: () => document.getElementById('process-btn'),
    resultArea: () => document.getElementById('result-area'),
    processingOverlay: () => document.querySelector('.processing-overlay'),
    resultImage: () => document.querySelector('.result-area img'),
  };

  async function initAIEngine() {
    try {
      const response = await FashionAPI.get('/ai/health');
      console.log('✓ AI Engine Status:', response);
      return response.status === 'ok';
    } catch (error) {
      console.error('✗ AI Engine unavailable:', error);
      showNotification('AI engine is currently offline. Try-on feature unavailable.', 'error');
      return false;
    }
  }

  function validateImage(file) {
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file', 'error');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification('Image must be less than 10 MB', 'error');
      return false;
    }
    return true;
  }

  function showQualityIndicator() {
    const indicator = DOM.qualityIndicator();
    if (indicator) indicator.style.display = 'flex';
  }

  function hideQualityIndicator() {
    const indicator = DOM.qualityIndicator();
    if (indicator) indicator.style.display = 'none';
  }

  async function handleUpload(file) {
    if (!validateImage(file)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      personImage = e.target.result;
      
      const uploadZone = DOM.uploadZone();
      if (uploadZone) {
        uploadZone.classList.add('has-image');
      }
      
      showQualityIndicator();
      showNotification('Photo uploaded successfully. Now select a garment.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const uploadZone = DOM.uploadZone();
    if (uploadZone) uploadZone.classList.remove('drag');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }

  async function selectGarment(garmentId, button) {
    selectedGarmentId = garmentId;
    
    // Update UI
    document.querySelectorAll('.garment-option').forEach(el => {
      el.classList.remove('selected');
    });
    if (button) button.classList.add('selected');
    
    showNotification('Garment selected. Click "Process Try-On" to generate.', 'success');
  }

  async function processTryOn() {
    if (!FashionAPI.isLoggedIn()) {
      showNotification('Please log in to use try-on feature', 'error');
      return;
    }

    if (!personImage) {
      showNotification('Please upload your photo first', 'error');
      return;
    }

    if (!selectedGarmentId) {
      showNotification('Please select a garment to try on', 'error');
      return;
    }

    isProcessing = true;
    
    const resultArea = DOM.resultArea();
    if (resultArea) {
      resultArea.innerHTML = `
        <div class="processing-overlay">
          <div class="processing-ring"></div>
          <div class="processing-text">Processing Try-On</div>
          <div class="processing-eta">This may take up to 2 minutes...</div>
        </div>
      `;
    }

    try {
      const response = await FashionAPI.post('/ai/tryon', {
        person_image_base64: personImage,
        garment_id: selectedGarmentId,
      });

      if (response.success) {
        // Display result
        if (resultArea) {
          resultArea.innerHTML = `
            <div class="result-comparison">
              <div class="comparison-pane">
                <img src="${personImage}" alt="Original photo" />
                <div class="comparison-label">Original</div>
              </div>
              <div class="comparison-pane">
                <img src="${response.result_image}" alt="Try-on result" />
                <div class="comparison-label">Try-On Result</div>
              </div>
            </div>
          `;
        }

        showNotification('Try-on completed successfully!', 'success');

        // Show action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'result-actions';
        actionsDiv.innerHTML = `
          <button onclick="TryOnModule.downloadResult('${response.result_image}')" class="btn btn-primary btn-sm">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
          <button onclick="TryOnModule.shareTryOn(${response.tryon_id})" class="btn btn-ghost dark btn-sm">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
          <button onclick="TryOnModule.startNewTryOn()" class="btn btn-ghost dark btn-sm">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 0 1 14.85-4.35L23 12M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 12"/>
            </svg>
            New Try-On
          </button>
        `;
        
        if (resultArea.parentElement) {
          resultArea.parentElement.appendChild(actionsDiv);
        }
      } else {
        showNotification('Try-on failed: ' + (response.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Try-on error:', error);
      showNotification('Error processing try-on: ' + error.message, 'error');
    } finally {
      isProcessing = false;
    }
  }

  function downloadResult(imagePath) {
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = `tryon_${new Date().getTime()}.png`;
    link.click();
  }

  function shareTryOn(tryOnId) {
    const shareUrl = `${window.location.origin}/tryon-result.html?id=${tryOnId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out my FashionAI try-on!',
        url: shareUrl,
      }).catch(err => console.error('Share error:', err));
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(shareUrl);
      showNotification('Share link copied to clipboard!', 'success');
    }
  }

  function startNewTryOn() {
    personImage = null;
    selectedGarmentId = null;
    hideQualityIndicator();
    
    const uploadZone = DOM.uploadZone();
    if (uploadZone) uploadZone.classList.remove('has-image');
    
    const resultArea = DOM.resultArea();
    if (resultArea) resultArea.innerHTML = '';
    
    const actionsDiv = resultArea?.parentElement?.querySelector('.result-actions');
    if (actionsDiv) actionsDiv.remove();
  }

  async function loadGarments(category = null) {
    try {
      let url = `/products?limit=8&sort=popular`;
      if (category) {
        url = `/products?cat=${category}&limit=8&sort=popular`;
      }
      const response = await FashionAPI.get(url);
      
      const grid = DOM.garmentGrid();
      if (!grid) return;

      grid.innerHTML = response.products.map(product => `
        <div class="garment-option" data-garment-id="${product.id}" onclick="selectGarment(this)">
          <img src="${JSON.parse(product.images || '[]')[0] || '/assets/placeholder.png'}" alt="${product.name}" />
          <div>
            <div class="garment-name">${product.name}</div>
            <div class="garment-price">${FashionAPI.fmt(product.sale_price || product.price)}</div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading garments:', error);
    }
  }

  async function loadUserTryOns() {
    if (!FashionAPI.isLoggedIn()) return;

    try {
      const response = await FashionAPI.get('/ai/try-ons?limit=12');
      
      const container = document.getElementById('user-tryons');
      if (!container) return;

      if (response.try_ons.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--stone);">No try-ons yet. Create your first one!</p>';
        return;
      }

      container.innerHTML = response.try_ons.map(tryOn => `
        <div class="tryon-card" onclick="TryOnModule.viewTryOn(${tryOn.id})">
          <img src="${tryOn.result_image}" alt="Try-on result" />
          <div class="tryon-meta">
            <div class="tryon-garment">${tryOn.garment.name}</div>
            <div class="tryon-date">${FashionAPI.fmtDate(tryOn.created_at)}</div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading try-ons:', error);
    }
  }

  function viewTryOn(tryOnId) {
    window.location.href = `/tryon-result.html?id=${tryOnId}`;
  }

  // Public API
  return {
    init: initAIEngine,
    handleUpload,
    handleDrop,
    selectGarment,
    processTryOn,
    downloadResult,
    shareTryOn,
    startNewTryOn,
    loadGarments,
    loadUserTryOns,
    viewTryOn,
    isProcessing: () => isProcessing,
  };
})();

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await TryOnModule.init();
    TryOnModule.loadGarments();
    
    // Add tab event listeners
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', async function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        const category = this.textContent.trim();
        if (category === 'All') {
          await TryOnModule.loadGarments();
        } else if (category === 'Saved') {
          await TryOnModule.loadUserTryOns();
        } else {
          await TryOnModule.loadGarments(category.toLowerCase());
        }
      });
    });
  });
} else {
  TryOnModule.init();
  TryOnModule.loadGarments();
  
  // Add tab event listeners
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', async function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.textContent.trim();
      if (category === 'All') {
        await TryOnModule.loadGarments();
      } else if (category === 'Saved') {
        await TryOnModule.loadUserTryOns();
      } else {
        await TryOnModule.loadGarments(category.toLowerCase());
      }
    });
  });
}

function handleUpload(input) {
  TryOnModule.handleUpload(input.files[0]);
}

function handleDrop(event) {
  TryOnModule.handleDrop(event);
}

function selectGarment(buttonEl) {
  // Extract garment ID from onclick handler or data attribute
  let garmentId = buttonEl.getAttribute('data-garment-id');
  if (!garmentId && buttonEl.onclick) {
    // Try to extract from onclick if data-garment-id not present
    const match = buttonEl.onclick.toString().match(/selectGarment\((\d+)/);
    if (match) garmentId = match[1];
  }
  TryOnModule.selectGarment(garmentId, buttonEl);
}

function showNotification(message, type = 'info') {
  // Simple notification (can be enhanced with a toast library)
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Visual notification with alert for now
  // Can be replaced with custom toast implementation
  if (type === 'error') {
    alert(message);
  }
}
