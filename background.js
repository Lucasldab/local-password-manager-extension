// Background script for Local Password Manager Extension
// Handles communication with the local password manager CLI

class LocalPasswordManager {
  constructor() {
    this.dbPath = null;
    this.isInitialized = false;
    this.loadSettings();
  }

  async loadSettings() {
    const result = await browser.storage.local.get(['dbPath', 'isInitialized']);
    this.dbPath = result.dbPath || null;
    this.isInitialized = result.isInitialized || false;
  }

  async saveSettings() {
    await browser.storage.local.set({
      dbPath: this.dbPath,
      isInitialized: this.isInitialized
    });
  }

  async executeCommand(args) {
    try {
      // Execute the local password manager CLI command
      const command = ['local-password-manager', ...args];
      
      // For now, we'll use a simple approach with fetch to a local server
      // In a real implementation, you'd need a native messaging host
      const response = await fetch('http://localhost:8080/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: args,
          dbPath: this.dbPath
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }

  async initializeVault(dbPath) {
    try {
      const result = await this.executeCommand(['init', '--db', dbPath]);
      this.dbPath = dbPath;
      this.isInitialized = true;
      await this.saveSettings();
      return result;
    } catch (error) {
      throw new Error(`Failed to initialize vault: ${error.message}`);
    }
  }

  async addCredential(service, username, password, notes = null) {
    try {
      const args = ['add', '--service', service, '--username', username, '--db', this.dbPath];
      if (notes) {
        args.push('--notes', notes);
      }
      
      // For password input, we'll need to handle this specially
      // The CLI expects interactive input, so we'll need a different approach
      const result = await this.executeCommand(args);
      return result;
    } catch (error) {
      throw new Error(`Failed to add credential: ${error.message}`);
    }
  }

  async getCredential(service, passwordOnly = false) {
    try {
      const args = ['get', '--service', service, '--db', this.dbPath];
      if (passwordOnly) {
        args.push('--password-only');
      }
      
      const result = await this.executeCommand(args);
      return result;
    } catch (error) {
      throw new Error(`Failed to get credential: ${error.message}`);
    }
  }

  async listServices() {
    try {
      const result = await this.executeCommand(['list', '--db', this.dbPath]);
      return result;
    } catch (error) {
      throw new Error(`Failed to list services: ${error.message}`);
    }
  }

  async deleteCredential(service) {
    try {
      const result = await this.executeCommand(['delete', '--service', service, '--db', this.dbPath]);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete credential: ${error.message}`);
    }
  }
}

// Initialize the password manager
const passwordManager = new LocalPasswordManager();

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'initialize':
        const result = await passwordManager.initializeVault(message.dbPath);
        sendResponse({ success: true, data: result });
        break;

      case 'addCredential':
        const addResult = await passwordManager.addCredential(
          message.service,
          message.username,
          message.password,
          message.notes
        );
        sendResponse({ success: true, data: addResult });
        break;

      case 'getCredential':
        const getResult = await passwordManager.getCredential(
          message.service,
          message.passwordOnly
        );
        sendResponse({ success: true, data: getResult });
        break;

      case 'listServices':
        const listResult = await passwordManager.listServices();
        sendResponse({ success: true, data: listResult });
        break;

      case 'deleteCredential':
        const deleteResult = await passwordManager.deleteCredential(message.service);
        sendResponse({ success: true, data: deleteResult });
        break;

      case 'getStatus':
        sendResponse({
          success: true,
          data: {
            isInitialized: passwordManager.isInitialized,
            dbPath: passwordManager.dbPath
          }
        });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep the message channel open for async response
});

// Handle installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Local Password Manager Extension installed');
    // Open setup page
    browser.tabs.create({
      url: browser.runtime.getURL('setup.html')
    });
  }
});
