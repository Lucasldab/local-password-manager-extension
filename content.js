// Content script for Local Password Manager Extension
// Handles interaction with web pages for auto-filling credentials

class ContentScript {
  constructor() {
    this.isEnabled = false;
    this.currentCredentials = null;
    this.init();
  }

  async init() {
    // Check if the extension is enabled for this page
    await this.checkExtensionStatus();
    
    if (this.isEnabled) {
      this.setupPageInteraction();
      this.detectLoginForms();
    }
  }

  async checkExtensionStatus() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getStatus' });
      this.isEnabled = response.success && response.data.isInitialized;
    } catch (error) {
      console.log('Local Password Manager not available:', error);
      this.isEnabled = false;
    }
  }

  setupPageInteraction() {
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+L to auto-fill credentials
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.autoFillCredentials();
      }
    });

    // Add visual indicator for password fields
    this.addPasswordFieldIndicators();
  }

  detectLoginForms() {
    // Look for common login form patterns
    const loginForms = document.querySelectorAll('form');
    
    loginForms.forEach(form => {
      const hasUsername = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="email"]');
      const hasPassword = form.querySelector('input[type="password"]');
      
      if (hasUsername && hasPassword) {
        this.addAutoFillButton(form);
      }
    });
  }

  addAutoFillButton(form) {
    // Check if button already exists
    if (form.querySelector('.lpm-autofill-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lpm-autofill-btn';
    button.innerHTML = '🔐 Auto-fill';
    button.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      cursor: pointer;
      z-index: 1000;
      opacity: 0.8;
      transition: opacity 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.8';
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.autoFillCredentials();
    });

    // Position the form relatively if it isn't already
    const formStyle = window.getComputedStyle(form);
    if (formStyle.position === 'static') {
      form.style.position = 'relative';
    }

    form.appendChild(button);
  }

  addPasswordFieldIndicators() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(field => {
      // Add a small indicator
      const indicator = document.createElement('span');
      indicator.className = 'lpm-password-indicator';
      indicator.innerHTML = '🔐';
      indicator.style.cssText = `
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        pointer-events: none;
      `;

      // Position the field relatively if it isn't already
      const fieldStyle = window.getComputedStyle(field);
      if (fieldStyle.position === 'static') {
        field.style.position = 'relative';
      }

      field.parentNode.appendChild(indicator);

      // Show indicator on focus
      field.addEventListener('focus', () => {
        indicator.style.opacity = '1';
        indicator.style.pointerEvents = 'auto';
      });

      field.addEventListener('blur', () => {
        indicator.style.opacity = '0.6';
        indicator.style.pointerEvents = 'none';
      });

      // Click indicator to auto-fill
      indicator.addEventListener('click', () => {
        this.autoFillCredentials();
      });
    });
  }

  async autoFillCredentials() {
    try {
      const domain = this.getCurrentDomain();
      const response = await browser.runtime.sendMessage({
        action: 'getCredential',
        service: domain
      });

      if (response.success && response.data) {
        this.fillCredentials(response.data);
        this.showNotification('Credentials auto-filled!', 'success');
      } else {
        this.showNotification('No credentials found for this site', 'info');
      }
    } catch (error) {
      console.error('Error auto-filling credentials:', error);
      this.showNotification('Error auto-filling credentials', 'error');
    }
  }

  getCurrentDomain() {
    return window.location.hostname;
  }

  fillCredentials(credentials) {
    const { username, password } = credentials;

    // Find username field
    const usernameField = this.findUsernameField();
    if (usernameField && username) {
      usernameField.value = username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find password field
    const passwordField = this.findPasswordField();
    if (passwordField && password) {
      passwordField.value = password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  findUsernameField() {
    const selectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[name*="user"]',
      'input[name*="login"]',
      'input[name*="email"]',
      'input[id*="user"]',
      'input[id*="login"]',
      'input[id*="email"]'
    ];

    for (const selector of selectors) {
      const field = document.querySelector(selector);
      if (field && this.isVisible(field)) {
        return field;
      }
    }

    return null;
  }

  findPasswordField() {
    const passwordField = document.querySelector('input[type="password"]');
    return passwordField && this.isVisible(passwordField) ? passwordField : null;
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.lpm-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `lpm-notification lpm-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 6px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
      border-left: 4px solid #667eea;
      animation: lpm-slide-in 0.3s ease-out;
    `;

    if (type === 'error') {
      notification.style.borderLeftColor = '#dc3545';
    } else if (type === 'success') {
      notification.style.borderLeftColor = '#28a745';
    }

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes lpm-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}

// Initialize content script
new ContentScript();
