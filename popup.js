// Popup script for Local Password Manager Extension

class PopupManager {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.checkStatus();
  }

  initializeElements() {
    // Status elements
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    
    // Sections
    this.setupSection = document.getElementById('setupSection');
    this.mainSection = document.getElementById('mainSection');
    
    // Setup form elements
    this.dbPathInput = document.getElementById('dbPath');
    this.masterPasswordInput = document.getElementById('masterPassword');
    this.initializeBtn = document.getElementById('initializeBtn');
    
    // Main interface elements
    this.serviceSearchInput = document.getElementById('serviceSearch');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchResults = document.getElementById('searchResults');
    this.addNewBtn = document.getElementById('addNewBtn');
    this.listAllBtn = document.getElementById('listAllBtn');
    
    // Modal elements
    this.addModal = document.getElementById('addModal');
    this.closeModal = document.getElementById('closeModal');
    this.newServiceInput = document.getElementById('newService');
    this.newUsernameInput = document.getElementById('newUsername');
    this.newPasswordInput = document.getElementById('newPassword');
    this.newNotesInput = document.getElementById('newNotes');
    this.saveCredentialBtn = document.getElementById('saveCredentialBtn');
    this.cancelAddBtn = document.getElementById('cancelAddBtn');
    
    // Message elements
    this.messageContainer = document.getElementById('messageContainer');
    this.messageContent = document.getElementById('messageContent');
    this.messageText = document.getElementById('messageText');
    this.closeMessage = document.getElementById('closeMessage');
    
    // Footer elements
    this.settingsBtn = document.getElementById('settingsBtn');
    this.refreshBtn = document.getElementById('refreshBtn');
  }

  bindEvents() {
    // Setup events
    this.initializeBtn.addEventListener('click', () => this.handleInitialize());
    
    // Search events
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.serviceSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
    
    // Main actions
    this.addNewBtn.addEventListener('click', () => this.showAddModal());
    this.listAllBtn.addEventListener('click', () => this.handleListAll());
    
    // Modal events
    this.closeModal.addEventListener('click', () => this.hideAddModal());
    this.cancelAddBtn.addEventListener('click', () => this.hideAddModal());
    this.saveCredentialBtn.addEventListener('click', () => this.handleSaveCredential());
    
    // Message events
    this.closeMessage.addEventListener('click', () => this.hideMessage());
    
    // Footer events
    this.settingsBtn.addEventListener('click', () => this.handleSettings());
    this.refreshBtn.addEventListener('click', () => this.handleRefresh());
    
    // Close modal when clicking outside
    this.addModal.addEventListener('click', (e) => {
      if (e.target === this.addModal) this.hideAddModal();
    });
  }

  async checkStatus() {
    try {
      const response = await this.sendMessage('getStatus');
      if (response.success) {
        const { isInitialized, dbPath } = response.data;
        this.updateStatus(isInitialized, dbPath);
        this.showAppropriateSection(isInitialized);
      } else {
        this.updateStatus(false, null);
        this.showAppropriateSection(false);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      this.updateStatus(false, null);
      this.showAppropriateSection(false);
    }
  }

  updateStatus(isInitialized, dbPath) {
    if (isInitialized) {
      this.statusDot.className = 'status-dot connected';
      this.statusText.textContent = 'Connected';
      if (dbPath) {
        this.dbPathInput.value = dbPath;
      }
    } else {
      this.statusDot.className = 'status-dot error';
      this.statusText.textContent = 'Not Connected';
    }
  }

  showAppropriateSection(isInitialized) {
    if (isInitialized) {
      this.setupSection.classList.add('hidden');
      this.mainSection.classList.remove('hidden');
    } else {
      this.setupSection.classList.remove('hidden');
      this.mainSection.classList.add('hidden');
    }
  }

  async handleInitialize() {
    const dbPath = this.dbPathInput.value.trim();
    const masterPassword = this.masterPasswordInput.value;

    if (!dbPath) {
      this.showMessage('Please enter a database path', 'error');
      return;
    }

    if (!masterPassword) {
      this.showMessage('Please enter your master password', 'error');
      return;
    }

    this.initializeBtn.disabled = true;
    this.initializeBtn.textContent = 'Initializing...';

    try {
      const response = await this.sendMessage('initialize', { dbPath });
      if (response.success) {
        this.showMessage('Vault initialized successfully!', 'success');
        this.checkStatus();
      } else {
        this.showMessage(`Failed to initialize: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showMessage(`Error: ${error.message}`, 'error');
    } finally {
      this.initializeBtn.disabled = false;
      this.initializeBtn.textContent = 'Initialize Connection';
    }
  }

  async handleSearch() {
    const service = this.serviceSearchInput.value.trim();
    if (!service) {
      this.showMessage('Please enter a service name', 'error');
      return;
    }

    this.searchBtn.disabled = true;
    this.searchBtn.textContent = 'Searching...';

    try {
      const response = await this.sendMessage('getCredential', { service });
      if (response.success) {
        this.displaySearchResults(response.data);
      } else {
        this.showMessage(`No credentials found for ${service}`, 'error');
        this.searchResults.innerHTML = '<p class="placeholder-text">No credentials found</p>';
      }
    } catch (error) {
      this.showMessage(`Error: ${error.message}`, 'error');
    } finally {
      this.searchBtn.disabled = false;
      this.searchBtn.textContent = 'Search';
    }
  }

  displaySearchResults(data) {
    if (!data || !data.username || !data.password) {
      this.searchResults.innerHTML = '<p class="placeholder-text">No credentials found</p>';
      return;
    }

    const html = `
      <div class="credential-item">
        <div class="credential-service">${this.escapeHtml(data.service || 'Unknown Service')}</div>
        <div class="credential-username">Username: ${this.escapeHtml(data.username)}</div>
        <div class="credential-password">Password: ${this.escapeHtml(data.password)}</div>
        <div class="credential-actions">
          <button class="btn btn-secondary" onclick="popupManager.copyToClipboard('${this.escapeHtml(data.username)}')">Copy Username</button>
          <button class="btn btn-secondary" onclick="popupManager.copyToClipboard('${this.escapeHtml(data.password)}')">Copy Password</button>
        </div>
      </div>
    `;
    
    this.searchResults.innerHTML = html;
  }

  async handleListAll() {
    this.listAllBtn.disabled = true;
    this.listAllBtn.textContent = 'Loading...';

    try {
      const response = await this.sendMessage('listServices');
      if (response.success) {
        this.displayAllServices(response.data);
      } else {
        this.showMessage(`Failed to list services: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showMessage(`Error: ${error.message}`, 'error');
    } finally {
      this.listAllBtn.disabled = false;
      this.listAllBtn.textContent = 'List All Services';
    }
  }

  displayAllServices(services) {
    if (!services || services.length === 0) {
      this.searchResults.innerHTML = '<p class="placeholder-text">No services found</p>';
      return;
    }

    const html = services.map(service => `
      <div class="credential-item">
        <div class="credential-service">${this.escapeHtml(service)}</div>
        <div class="credential-actions">
          <button class="btn btn-secondary" onclick="popupManager.handleSearch('${this.escapeHtml(service)}')">View Credentials</button>
        </div>
      </div>
    `).join('');

    this.searchResults.innerHTML = html;
  }

  showAddModal() {
    this.addModal.classList.remove('hidden');
    this.newServiceInput.focus();
  }

  hideAddModal() {
    this.addModal.classList.add('hidden');
    this.clearAddForm();
  }

  clearAddForm() {
    this.newServiceInput.value = '';
    this.newUsernameInput.value = '';
    this.newPasswordInput.value = '';
    this.newNotesInput.value = '';
  }

  async handleSaveCredential() {
    const service = this.newServiceInput.value.trim();
    const username = this.newUsernameInput.value.trim();
    const password = this.newPasswordInput.value;
    const notes = this.newNotesInput.value.trim();

    if (!service || !username || !password) {
      this.showMessage('Please fill in all required fields', 'error');
      return;
    }

    this.saveCredentialBtn.disabled = true;
    this.saveCredentialBtn.textContent = 'Saving...';

    try {
      const response = await this.sendMessage('addCredential', {
        service,
        username,
        password,
        notes: notes || null
      });
      
      if (response.success) {
        this.showMessage('Credential saved successfully!', 'success');
        this.hideAddModal();
      } else {
        this.showMessage(`Failed to save credential: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showMessage(`Error: ${error.message}`, 'error');
    } finally {
      this.saveCredentialBtn.disabled = false;
      this.saveCredentialBtn.textContent = 'Save Credential';
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage('Copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showMessage('Copied to clipboard!', 'success');
    }
  }

  handleSettings() {
    // TODO: Implement settings page
    this.showMessage('Settings feature coming soon!', 'error');
  }

  async handleRefresh() {
    this.refreshBtn.disabled = true;
    this.refreshBtn.textContent = 'Refreshing...';
    
    await this.checkStatus();
    
    this.refreshBtn.disabled = false;
    this.refreshBtn.textContent = 'Refresh';
  }

  showMessage(text, type = 'info') {
    this.messageText.textContent = text;
    this.messageContent.className = `message-content ${type}`;
    this.messageContainer.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideMessage();
    }, 5000);
  }

  hideMessage() {
    this.messageContainer.classList.add('hidden');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async sendMessage(action, data = {}) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({ action, ...data })
        .then(response => {
          if (response && response.success !== undefined) {
            resolve(response);
          } else {
            reject(new Error('Invalid response format'));
          }
        })
        .catch(reject);
    });
  }
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});
