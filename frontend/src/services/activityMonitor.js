/**
 * Activity Monitor Service
 * Tracks user activity during time tracking sessions
 */

class ActivityMonitor {
  constructor() {
    this.isActive = false;
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.startTime = null;
    this.intervalId = null;
    this.onActivityUpdate = null;
    
    // Bind methods to preserve context
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * Start monitoring user activity
   */
  start(onActivityUpdate) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.startTime = Date.now();
    this.onActivityUpdate = onActivityUpdate;
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('keypress', this.handleKeyPress);
    document.addEventListener('keydown', this.handleKeyPress);
    document.addEventListener('click', this.handleClick);
    
    // Update activity stats every 10 seconds
    this.intervalId = setInterval(() => {
      this.calculateAndReportActivity();
    }, 10000);
    
    console.log('Activity monitoring started');
  }

  /**
   * Stop monitoring user activity
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keypress', this.handleKeyPress);
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('click', this.handleClick);
    
    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('Activity monitoring stopped');
  }

  /**
   * Handle mouse movement events
   */
  handleMouseMove() {
    if (this.isActive) {
      this.mouseEvents++;
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeyPress() {
    if (this.isActive) {
      this.keyboardEvents++;
    }
  }

  /**
   * Handle click events
   */
  handleClick() {
    if (this.isActive) {
      this.mouseEvents += 2; // Clicks count more than movements
    }
  }

  /**
   * Calculate activity percentage and report to callback
   */
  calculateAndReportActivity() {
    if (!this.isActive || !this.onActivityUpdate) return;
    
    const now = Date.now();
    const elapsedMinutes = (now - this.startTime) / (1000 * 60);
    
    // Calculate activity based on events per minute
    // These thresholds can be adjusted based on requirements
    const mouseActivityPerMinute = this.mouseEvents / elapsedMinutes;
    const keyboardActivityPerMinute = this.keyboardEvents / elapsedMinutes;
    
    // Convert to percentage (adjust multipliers as needed)
    const mouseActivity = Math.min(Math.round(mouseActivityPerMinute * 2), 100);
    const keyboardActivity = Math.min(Math.round(keyboardActivityPerMinute * 5), 100);
    
    // Report activity
    this.onActivityUpdate({
      mouseActivity,
      keyboardActivity,
      totalEvents: this.mouseEvents + this.keyboardEvents,
      elapsedMinutes: Math.round(elapsedMinutes)
    });
  }

  /**
   * Get current activity stats
   */
  getCurrentStats() {
    if (!this.isActive) {
      return {
        mouseActivity: 0,
        keyboardActivity: 0,
        totalEvents: 0,
        elapsedMinutes: 0
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
      elapsedMinutes: Math.round(elapsedMinutes)
    };
  }

  /**
   * Reset activity counters
   */
  reset() {
    this.mouseEvents = 0;
    this.keyboardEvents = 0;
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const activityMonitor = new ActivityMonitor();
export default activityMonitor;