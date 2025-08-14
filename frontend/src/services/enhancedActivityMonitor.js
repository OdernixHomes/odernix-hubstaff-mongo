/**
 * Enhanced Activity Monitor with Advanced Tracking
 * Includes screenshot capture, application tracking, and website monitoring
 */

import { activityAPI } from '../api/client';

class EnhancedActivityMonitor {
  constructor() {
    this.isActive = false;
    this.currentTimeEntryId = null;
    this.settings = {
      screenshotEnabled: true,
      screenshotInterval: 600000, // 10 minutes
      applicationTracking: true,
      websiteTracking: true,
      keystrokeTracking: true
    };
    
    // Activity counters
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.startTime = null;
    this.lastActivityUpdate = null;
    this.currentApplication = null;
    this.currentUrl = null;
    
    // Intervals
    this.activityUpdateInterval = null;
    this.screenshotInterval = null;
    
    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    
    this.init();
  }
  
  init() {
    // Load user settings
    this.loadSettings();
    
    // Setup event listeners
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Track URL changes for SPAs
    this.setupUrlTracking();
  }
  
  async loadSettings() {
    try {
      const response = await activityAPI.getMonitoringSettings();
      this.settings = { ...this.settings, ...response.data };
    } catch (error) {
      console.error('Failed to load monitoring settings:', error);
    }
  }
  
  async start(timeEntryId) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.currentTimeEntryId = timeEntryId;
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.startTime = Date.now();
    this.lastActivityUpdate = Date.now();
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    document.addEventListener('keypress', this.handleKeyPress, { passive: true });
    document.addEventListener('keydown', this.handleKeyPress, { passive: true });
    document.addEventListener('click', this.handleClick, { passive: true });
    
    // Start activity update interval (every 30 seconds)
    this.activityUpdateInterval = setInterval(() => {
      this.sendActivityUpdate();
    }, 30000);
    
    // Start screenshot capture if enabled
    if (this.settings.screenshotEnabled) {
      this.startScreenshotCapture();
    }
    
    // Track current application/website
    this.trackCurrentContext();
    
    console.log('Enhanced activity monitoring started');
  }
  
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Send final activity update
    this.sendActivityUpdate();
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keypress', this.handleKeyPress);
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('click', this.handleClick);
    
    // Clear intervals
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
      this.activityUpdateInterval = null;
    }
    
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    
    this.currentTimeEntryId = null;
    console.log('Enhanced activity monitoring stopped');
  }
  
  handleMouseMove() {
    if (this.isActive) {
      this.mouseEvents++;
    }
  }
  
  handleKeyPress(event) {
    if (this.isActive && this.settings.keystrokeTracking) {
      this.keyboardEvents++;
      
      // Track application context
      if (this.settings.applicationTracking) {
        this.trackCurrentContext();
      }
    }
  }
  
  handleClick() {
    if (this.isActive) {
      this.mouseEvents += 2; // Clicks are more significant than movements
    }
  }
  
  handleVisibilityChange() {
    if (document.hidden) {
      // Page became hidden, user might have switched applications
      if (this.isActive && this.settings.applicationTracking) {
        this.trackApplicationSwitch();
      }
    } else {
      // Page became visible again
      if (this.isActive) {
        this.trackCurrentContext();
      }
    }
  }
  
  handleBeforeUnload() {
    if (this.isActive) {
      // Send final activity update before page unload
      navigator.sendBeacon('/api/monitoring/activity/update', JSON.stringify({
        time_entry_id: this.currentTimeEntryId,
        keystroke_count: this.keyboardEvents,
        mouse_clicks: this.mouseEvents,
        current_url: window.location.href
      }));
    }
  }
  
  setupUrlTracking() {
    // Track URL changes in SPAs
    let lastUrl = window.location.href;
    
    const urlChangeHandler = () => {
      if (this.isActive && this.settings.websiteTracking) {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          this.trackWebsiteNavigation(currentUrl);
          lastUrl = currentUrl;
        }
      }
    };
    
    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(urlChangeHandler, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(urlChangeHandler, 0);
    };
    
    // Listen for popstate events
    window.addEventListener('popstate', urlChangeHandler);
  }
  
  async sendActivityUpdate() {
    if (!this.isActive || !this.currentTimeEntryId) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastActivityUpdate;
    
    // Only send update if there's been some activity or enough time has passed
    if (this.mouseEvents === 0 && this.keyboardEvents === 0 && timeSinceLastUpdate < 60000) {
      return;
    }
    
    try {
      await activityAPI.updateActivity({
        time_entry_id: this.currentTimeEntryId,
        keystroke_count: this.keyboardEvents,
        mouse_clicks: this.mouseEvents,
        mouse_movements: Math.floor(this.mouseEvents / 2),
        active_application: this.currentApplication,
        current_url: window.location.href
      });
      
      // Reset counters
      this.mouseEvents = 0;
      this.keyboardEvents = 0;
      this.lastActivityUpdate = now;
      
    } catch (error) {
      console.error('Failed to send activity update:', error);
    }
  }
  
  async startScreenshotCapture() {
    if (!this.settings.screenshotEnabled || !this.currentTimeEntryId) return;
    
    // Take initial screenshot
    await this.captureScreenshot();
    
    // Set up periodic screenshot capture
    this.screenshotInterval = setInterval(() => {
      this.captureScreenshot();
    }, this.settings.screenshotInterval);
  }
  
  async captureScreenshot() {
    try {
      // Use Screen Capture API if available
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            mediaSource: 'screen',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          // Convert to blob and upload
          canvas.toBlob(async (blob) => {
            await this.uploadScreenshot(blob);
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
          }, 'image/jpeg', 0.8);
        };
        
      } else {
        console.warn('Screen capture not supported');
      }
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    }
  }
  
  async uploadScreenshot(blob) {
    if (!blob || !this.currentTimeEntryId) return;
    
    const formData = new FormData();
    formData.append('file', blob, `screenshot_${Date.now()}.jpg`);
    formData.append('time_entry_id', this.currentTimeEntryId);
    formData.append('activity_level', this.calculateCurrentActivityLevel());
    formData.append('screenshot_type', 'periodic');
    
    try {
      await activityAPI.uploadScreenshot(formData);
    } catch (error) {
      console.error('Screenshot upload failed:', error);
    }
  }
  
  calculateCurrentActivityLevel() {
    const now = Date.now();
    const elapsed = (now - this.lastActivityUpdate) / 1000; // seconds
    const totalActivity = this.mouseEvents + this.keyboardEvents;
    const activityRate = totalActivity / Math.max(elapsed, 1);
    
    // Convert to percentage (0-100)
    // Adjust these thresholds based on your needs
    return Math.min(activityRate * 10, 100);
  }
  
  trackCurrentContext() {
    // Get current application name (browser in web context)
    const currentApp = this.detectCurrentApplication();
    
    if (currentApp !== this.currentApplication) {
      this.currentApplication = currentApp;
      this.trackApplicationSwitch();
    }
    
    // Track current URL
    if (this.settings.websiteTracking) {
      const currentUrl = window.location.href;
      if (currentUrl !== this.currentUrl) {
        this.currentUrl = currentUrl;
        this.trackWebsiteNavigation(currentUrl);
      }
    }
  }
  
  detectCurrentApplication() {
    // In web context, we can detect the browser
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Google Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Mozilla Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edg')) {
      return 'Microsoft Edge';
    } else {
      return 'Web Browser';
    }
  }
  
  async trackApplicationSwitch() {
    if (!this.currentApplication || !this.currentTimeEntryId) return;
    
    try {
      await activityAPI.recordApplicationSwitch({
        time_entry_id: this.currentTimeEntryId,
        application_name: this.currentApplication,
        application_title: document.title
      });
    } catch (error) {
      console.error('Failed to track application switch:', error);
    }
  }
  
  async trackWebsiteNavigation(url) {
    if (!url || !this.currentTimeEntryId) return;
    
    try {
      await activityAPI.recordWebsiteNavigation({
        time_entry_id: this.currentTimeEntryId,
        url: url,
        title: document.title
      });
    } catch (error) {
      console.error('Failed to track website navigation:', error);
    }
  }
  
  async updateSettings(newSettings) {
    try {
      await activityAPI.updateMonitoringSettings(newSettings);
      this.settings = { ...this.settings, ...newSettings };
      
      // Restart screenshot capture if settings changed
      if (this.isActive && newSettings.screenshotEnabled !== undefined) {
        if (this.screenshotInterval) {
          clearInterval(this.screenshotInterval);
          this.screenshotInterval = null;
        }
        
        if (newSettings.screenshotEnabled) {
          this.startScreenshotCapture();
        }
      }
      
    } catch (error) {
      console.error('Failed to update monitoring settings:', error);
      throw error;
    }
  }
  
  getCurrentStats() {
    if (!this.isActive) {
      return {
        mouseActivity: 0,
        keyboardActivity: 0,
        totalEvents: 0,
        elapsedMinutes: 0,
        activityLevel: 0
      };
    }
    
    const now = Date.now();
    const elapsedMinutes = (now - this.startTime) / (1000 * 60);
    const mouseActivityPerMinute = this.mouseEvents / elapsedMinutes;
    const keyboardActivityPerMinute = this.keyboardEvents / elapsedMinutes;
    
    return {
      mouseActivity: Math.min(Math.round(mouseActivityPerMinute * 2), 100),
      keyboardActivity: Math.min(Math.round(keyboardActivityPerMinute * 5), 100),
      totalEvents: this.mouseEvents + this.keyboardEvents,
      elapsedMinutes: Math.round(elapsedMinutes),
      activityLevel: this.calculateCurrentActivityLevel(),
      currentApplication: this.currentApplication,
      currentUrl: this.currentUrl
    };
  }
  
  getSettings() {
    return { ...this.settings };
  }
}

// Export singleton instance
export const enhancedActivityMonitor = new EnhancedActivityMonitor();
export default enhancedActivityMonitor;