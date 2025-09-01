class SetupManager {
  constructor() {
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.dbPathInput = document.getElementById('dbPath');
    this.masterPasswordInput = document.getElementById('masterPassword');
    this.initializeBtn = document.getElementById('initializeBtn');
    this.testConnectionBtn = document.getElementById('testConnectionBtn');
    this.status = document.getElementById('status');
  }

  bindEvents() {
    this.initializeBtn.addEventListener('click', () => this.handleInitialize());
    this.testConnectionBtn.addEventListener('click', () => this.handleTestConnection());
  }

  showStatus(message, type = 'info') {
    this.status.textContent = message;
    this.status.className = `status ${type}`;
    this.status.style.display = 'block';
  }

  hideStatus() {
    this.status.style.display = 'none';
  }

  async handleInitialize() {
    const dbPath = this.dbPathInput.value.trim();
    const masterPassword = this.masterPasswordInput.value;

    if (!dbPath) {
      this.showStatus('Please enter a database path', 'error');
      return;
    }

    if (!masterPassword) {
      this.showStatus('Please enter a master password', 'error');
      return;
    }

    this.initializeBtn.disabled = true;
    this.initializeBtn.textContent = 'Initializing...';

    try {
      const response = await browser.runtime.sendMessage({
        action: 'initialize',
        dbPath
      });

      if (response.success) {
        this.showStatus('Vault initialized successfully! You can now close this page and use the extension.', 'success');
      } else {
        this.showStatus(`Failed to initialize: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showStatus(`Error: ${error.message}`, 'error');
    } finally {
      this.initializeBtn.disabled = false;
      this.initializeBtn.textContent = 'Initialize Password Vault';
    }
  }

  async handleTestConnection() {
    this.testConnectionBtn.disabled = true;
    this.testConnectionBtn.textContent = 'Testing...';

    try {
      const response = await fetch('http://127.0.0.1:8080/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          args: ['list', '--db', this.dbPathInput.value.trim()]
        })
      });

      if (response.ok) {
        this.showStatus('Connection successful! Bridge server is running.', 'success');
      } else {
        this.showStatus('Connection failed. Make sure the bridge server is running.', 'error');
      }
    } catch (error) {
      this.showStatus('Connection failed. Make sure the bridge server is running on localhost:8080', 'error');
    } finally {
      this.testConnectionBtn.disabled = false;
      this.testConnectionBtn.textContent = 'Test Connection';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SetupManager();
});

