/**
 * Enhanced Activity Monitor with Advanced Tracking
 * Includes screenshot capture, application tracking, and website monitoring
 */

import { activityAPI } from '../api/client';

class EnhancedActivityMonitor {
  constructor() {
    this.isActive = false;
    this.currentTimeEntryId = null;
    this.currentUserId = null;
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
    
    // Screenshot permission management
    this.hasScreenshotPermission = false;
    this.screenshotStream = null;
    this.permissionRequested = false;
    
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
        screenshotEnabled: true, // Re-enable screenshots - monitoring endpoints are now secure
        screenshotInterval: 600000, // 10 minutes
        applicationTracking: true,
        websiteTracking: true,
        keystrokeTracking: true
      };
      console.log('Using default monitoring settings:', this.settings);
    }
  }
  
  async start(timeEntryId, userId = null) {
    if (this.isActive) return { success: true, message: 'Already active' };
    
    console.log('Starting enhanced activity monitor for time entry:', timeEntryId, 'user:', userId);
    
    this.currentTimeEntryId = timeEntryId;
    this.currentUserId = userId;
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.startTime = Date.now();
    this.lastActivityUpdate = Date.now();
    
    // Request screenshot permission first if required
    if (this.settings.screenshotEnabled) {
      // Check if we already have an active stream from current session
      if (this.hasScreenshotPermission && this.screenshotStream && !this.screenshotStream.getTracks().some(track => track.readyState === 'ended')) {
        console.log('✅ Screenshot permission already active, reusing existing stream');
        // Ensure screenshot capture is running
        if (!this.screenshotInterval) {
          this.startScreenshotCapture();
        }
      } else {
        // Only show the permission dialog once per browser session
        if (!this.permissionRequested || !this.hasScreenshotPermission) {
          console.log('⚠️ Screenshot monitoring is required. You will be asked to share your screen once.');
          try {
            await this.requestScreenshotPermission();
            if (!this.hasScreenshotPermission) {
              console.log('❌ Screenshot permission denied. Cannot start time tracking.');
              return { 
                success: false, 
                message: 'Screenshot permission is required for time tracking. Please grant permission and try again.' 
              };
            }
            console.log('✅ Screenshot permission granted! This permission will be reused for future time tracking sessions.');
          } catch (error) {
            console.error('Screenshot permission request failed:', error);
            return { 
              success: false, 
              message: 'Failed to request screenshot permission. Time tracking cannot start.' 
            };
          }
        } else {
          // Permission was requested before but stream ended
          console.log('🔄 Re-establishing screenshot stream...');
          try {
            await this.requestScreenshotPermission();
          } catch (error) {
            console.warn('Failed to re-establish screenshot stream:', error);
          }
        }
      }
    }
    
    // Only set as active after permission is confirmed
    this.isActive = true;
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    document.addEventListener('keypress', this.handleKeyPress, { passive: true });
    document.addEventListener('keydown', this.handleKeyPress, { passive: true });
    document.addEventListener('click', this.handleClick, { passive: true });
    
    // Start activity update interval (every 30 seconds)
    this.activityUpdateInterval = setInterval(() => {
      this.sendActivityUpdate();
    }, 30000);
    
    // Track current application/website
    this.trackCurrentContext();
    
    console.log('✅ Enhanced activity monitoring started successfully with screenshot monitoring enabled!');
    return { 
      success: true, 
      message: 'Activity monitoring started successfully with screenshot capture enabled.' 
    };
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
    
    // Stop screenshot stream but keep permission for next session
    if (this.screenshotStream) {
      this.screenshotStream.getTracks().forEach(track => track.stop());
      this.screenshotStream = null;
    }
    
    this.currentTimeEntryId = null;
    this.currentUserId = null;
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
  
  async requestScreenshotPermission() {
    // If we already have permission and active stream, don't request again
    if (this.hasScreenshotPermission && this.screenshotStream) {
      console.log('🔄 Reusing existing screenshot permission and stream');
      return Promise.resolve();
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        console.log('📋 Requesting screen capture permission (this will show a browser dialog)...');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          console.warn('Screen capture not supported in this browser');
          this.hasScreenshotPermission = false;
          reject(new Error('Screen capture not supported in this browser'));
          return;
        }
        
        // Request permission once and keep the stream
        this.screenshotStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            mediaSource: 'screen',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        this.hasScreenshotPermission = true;
        this.permissionRequested = true;
        console.log('✅ Screenshot permission granted! Stream will be kept alive for future use.');
        
        // Start screenshot capture schedule
        this.startScreenshotCapture();
        
        // Handle stream end (if user manually stops sharing)
        this.screenshotStream.getVideoTracks()[0].addEventListener('ended', () => {
          console.log('🛑 User stopped screen sharing manually');
          this.hasScreenshotPermission = false;
          this.screenshotStream = null;
          this.permissionRequested = false;
          if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
          }
          
          // If time tracking is active, we need to stop it
          if (this.isActive) {
            console.warn('⚠️ Screen sharing stopped during active time tracking. Activity monitoring will continue but screenshots will be disabled.');
          }
        });
        
        resolve();
        
      } catch (error) {
        this.hasScreenshotPermission = false;
        this.permissionRequested = true; // Mark as requested even if failed
        
        if (error.name === 'NotAllowedError') {
          console.warn('❌ User denied screen capture permission. Time tracking cannot continue.');
          this.settings.screenshotEnabled = false;
          reject(new Error('User denied screen capture permission'));
        } else if (error.name === 'NotSupportedError') {
          console.warn('Screen capture not supported');
          reject(new Error('Screen capture not supported'));
        } else {
          console.error('Screenshot permission request failed:', error);
          reject(error);
        }
      }
    });
  }

  async startScreenshotCapture() {
    if (!this.settings.screenshotEnabled || !this.hasScreenshotPermission || !this.currentTimeEntryId) {
      console.log('Screenshot capture not started:', {
        screenshotEnabled: this.settings.screenshotEnabled,
        hasPermission: this.hasScreenshotPermission,
        hasTimeEntryId: !!this.currentTimeEntryId
      });
      return;
    }
    
    console.log(`✅ Starting screenshot capture with ${this.settings.screenshotInterval / 60000} minute intervals`);
    
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
    if (!this.hasScreenshotPermission || !this.screenshotStream) {
      console.log('Cannot capture screenshot: no permission or stream');
      return;
    }
    
    try {
      console.log('📸 Capturing screenshot using existing permission...');
      
      const video = document.createElement('video');
      video.srcObject = this.screenshotStream;
      video.play();
      
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded, creating canvas...');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        console.log(`✅ Screenshot captured: ${canvas.width}x${canvas.height}`);
        
        // Convert to blob and upload
        canvas.toBlob(async (blob) => {
          console.log(`📤 Screenshot blob created: ${blob.size} bytes`);
          await this.uploadScreenshot(blob);
        }, 'image/jpeg', 0.8);
      };
      
      video.onerror = (error) => {
        console.error('Video error during screenshot capture:', error);
      };
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Don't disable screenshots, just log the error
    }
  }
  
  async uploadScreenshot(blob) {
    if (!blob || !this.currentTimeEntryId) {
      console.error('Cannot upload screenshot: missing blob or time entry ID');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userId = this.currentUserId || 'unknown';
    const fileName = `screenshot_${userId}_${timestamp}.jpg`;
    
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('time_entry_id', this.currentTimeEntryId);
    formData.append('user_id', userId);
    formData.append('activity_level', this.calculateCurrentActivityLevel());
    formData.append('screenshot_type', 'periodic');
    formData.append('timestamp', new Date().toISOString());
    
    console.log('📤 Uploading screenshot...', {
      fileName: fileName,
      timeEntryId: this.currentTimeEntryId,
      userId: userId,
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
  
  // Get screenshot permission status
  getScreenshotPermissionStatus() {
    return {
      hasPermission: this.hasScreenshotPermission,
      streamActive: !!this.screenshotStream,
      screenshotEnabled: this.settings.screenshotEnabled,
      intervalMinutes: this.settings.screenshotInterval / 60000
    };
  }
  
  // Request permission again if needed
  async requestPermissionAgain() {
    if (!this.hasScreenshotPermission) {
      await this.requestScreenshotPermission();
    }
    return this.hasScreenshotPermission;
  }
}

// Export singleton instance
export const enhancedActivityMonitor = new EnhancedActivityMonitor();
export default enhancedActivityMonitor;