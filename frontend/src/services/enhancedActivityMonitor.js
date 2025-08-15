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
    // Setup event listeners
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Track URL changes for SPAs
    this.setupUrlTracking();
    
    // Load user settings asynchronously (non-blocking)
    this.loadSettings();
  }
  
  async loadSettings() {
    try {
      console.log('Loading monitoring settings...');
      const response = await activityAPI.getMonitoringSettings();
      this.settings = { ...this.settings, ...response.data };
      console.log('Monitoring settings loaded:', this.settings);
    } catch (error) {
      // Check if this is a 503 service unavailable error
      if (error.response?.status === 503) {
        console.warn('Monitoring service temporarily unavailable (503). Using defaults and will retry later.');
        console.info('Monitoring endpoints are temporarily disabled for security patches.');
      } else {
        console.warn('Failed to load monitoring settings, using defaults:', error);
      }
      
      // Use default settings if loading fails
      this.settings = {
        screenshotEnabled: false, // Disable screenshots when backend is unavailable
        screenshotInterval: 600000, // 10 minutes
        applicationTracking: true,
        websiteTracking: true,
        keystrokeTracking: true
      };
      console.log('Using default monitoring settings:', this.settings);
    }
  }
  
  async start(timeEntryId) {
    if (this.isActive) return;
    
    console.log('Starting enhanced activity monitor for time entry:', timeEntryId);
    
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
    
    // Wait a moment for settings to load, then start screenshot capture
    setTimeout(() => {
      if (this.settings.screenshotEnabled) {
        console.log('Starting screenshot capture...');
        this.startScreenshotCapture();
      } else {
        console.log('Screenshot capture disabled in settings');
      }
    }, 2000);
    
    // Track current application/website
    this.trackCurrentContext();
    
    console.log('Enhanced activity monitoring started successfully');
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
    if (!this.isActive || !this.currentTimeEntryId) {
      console.log('Skipping activity update: not active or no time entry ID');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastActivityUpdate;
    
    // Only send update if there's been some activity or enough time has passed
    if (this.mouseEvents === 0 && this.keyboardEvents === 0 && timeSinceLastUpdate < 60000) {
      console.log('Skipping activity update: no activity and less than 60 seconds passed');
      return;
    }
    
    const activityData = {
      time_entry_id: this.currentTimeEntryId,
      keystroke_count: this.keyboardEvents,
      mouse_clicks: this.mouseEvents,
      mouse_movements: Math.floor(this.mouseEvents / 2),
      active_application: this.currentApplication,
      current_url: window.location.href
    };
    
    console.log('Sending activity update:', activityData);
    
    try {
      const response = await activityAPI.updateActivity(activityData);
      console.log('Activity update sent successfully:', response.data);
      
      // Reset counters
      this.mouseEvents = 0;
      this.keyboardEvents = 0;
      this.lastActivityUpdate = now;
      
    } catch (error) {
      if (error.response?.status === 503) {
        console.warn('Activity monitoring temporarily unavailable (503). Data will be queued for later.');
        // Don't reset counters so data accumulates for when service is restored
      } else {
        console.error('Failed to send activity update:', error);
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        // Reset counters even on error to prevent infinite accumulation
        this.mouseEvents = 0;
        this.keyboardEvents = 0;
        this.lastActivityUpdate = now;
      }
    }
  }
  
  async startScreenshotCapture() {
    if (!this.settings.screenshotEnabled || !this.currentTimeEntryId) {
      console.log('Screenshot capture not started:', {
        screenshotEnabled: this.settings.screenshotEnabled,
        hasTimeEntryId: !!this.currentTimeEntryId
      });
      return;
    }
    
    console.log(`Starting screenshot capture with ${this.settings.screenshotInterval / 60000} minute intervals`);
    
    // Take initial screenshot after a short delay
    setTimeout(() => {
      this.captureScreenshot();
    }, 5000);
    
    // Set up periodic screenshot capture
    this.screenshotInterval = setInterval(() => {
      this.captureScreenshot();
    }, this.settings.screenshotInterval);
  }
  
  async captureScreenshot() {
    try {
      console.log('Attempting to capture screenshot...');
      
      // Use Screen Capture API if available
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        console.log('Screen Capture API available, requesting permission...');
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            mediaSource: 'screen',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        console.log('Screen capture permission granted');
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded, creating canvas...');
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          console.log(`Screenshot captured: ${canvas.width}x${canvas.height}`);
          
          // Convert to blob and upload
          canvas.toBlob(async (blob) => {
            console.log(`Screenshot blob created: ${blob.size} bytes`);
            await this.uploadScreenshot(blob);
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
          }, 'image/jpeg', 0.8);
        };
        
        video.onerror = (error) => {
          console.error('Video error:', error);
          stream.getTracks().forEach(track => track.stop());
        };
        
      } else {
        console.warn('Screen capture not supported in this browser');
      }
      
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.warn('User denied screen capture permission');
        // Disable screenshots for this session
        this.settings.screenshotEnabled = false;
        if (this.screenshotInterval) {
          clearInterval(this.screenshotInterval);
          this.screenshotInterval = null;
        }
      } else if (error.name === 'NotSupportedError') {
        console.warn('Screen capture not supported');
      } else {
        console.error('Screenshot capture failed:', error);
      }
    }
  }
  
  async uploadScreenshot(blob) {
    if (!blob || !this.currentTimeEntryId) {
      console.error('Cannot upload screenshot: missing blob or time entry ID');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', blob, `screenshot_${Date.now()}.jpg`);
    formData.append('time_entry_id', this.currentTimeEntryId);
    formData.append('activity_level', this.calculateCurrentActivityLevel());
    formData.append('screenshot_type', 'periodic');
    
    console.log('Uploading screenshot...', {
      timeEntryId: this.currentTimeEntryId,
      activityLevel: this.calculateCurrentActivityLevel(),
      blobSize: blob.size
    });
    
    try {
      const response = await activityAPI.uploadScreenshot(formData);
      console.log('Screenshot uploaded successfully:', response.data);
    } catch (error) {
      console.error('Screenshot upload failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
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