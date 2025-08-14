import React, { useState, useEffect, useCallback } from 'react';
import { productivityAPI } from '../api/client';

const ProductivityTracker = ({ timeEntryId, isTracking, onTrackingUpdate }) => {
  const [trackingState, setTrackingState] = useState({
    isActive: false,
    activityLevel: 0,
    productivityLevel: 'moderate',
    currentApp: null,
    lastScreenshot: null,
    keystrokeCount: 0,
    mouseClicks: 0,
    recommendations: []
  });

  const [settings, setSettings] = useState({
    screenshotsEnabled: true,
    keyboardTracking: true,
    mouseTracking: true,
    screenshotInterval: 600 // 10 minutes
  });

  const [isConsentGiven, setIsConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Activity tracking interval
  useEffect(() => {
    let activityInterval;
    let screenshotInterval;

    if (isTracking && isConsentGiven && timeEntryId) {
      // Start tracking
      startProductivityTracking();

      // Track activity every 30 seconds
      activityInterval = setInterval(() => {
        trackActivity();
      }, 30000);

      // Take screenshots based on interval
      if (settings.screenshotsEnabled) {
        screenshotInterval = setInterval(() => {
          captureScreenshot();
        }, settings.screenshotInterval * 1000);
      }
    }

    return () => {
      if (activityInterval) clearInterval(activityInterval);
      if (screenshotInterval) clearInterval(screenshotInterval);
      if (trackingState.isActive) {
        stopProductivityTracking();
      }
    };
  }, [isTracking, isConsentGiven, timeEntryId, settings.screenshotsEnabled, settings.screenshotInterval]);

  const startProductivityTracking = async () => {
    try {
      const response = await productivityAPI.startTracking({
        time_entry_id: timeEntryId,
        enable_screenshots: settings.screenshotsEnabled,
        enable_keyboard_tracking: settings.keyboardTracking,
        enable_mouse_tracking: settings.mouseTracking
      });

      if (response.data.success) {
        setTrackingState(prev => ({
          ...prev,
          isActive: true
        }));
        onTrackingUpdate?.(true);
      }
    } catch (error) {
      console.error('Failed to start productivity tracking:', error);
    }
  };

  const stopProductivityTracking = async () => {
    try {
      const response = await productivityAPI.stopTracking(timeEntryId);
      
      setTrackingState(prev => ({
        ...prev,
        isActive: false
      }));
      onTrackingUpdate?.(false);
      
      return response.data.session_summary;
    } catch (error) {
      console.error('Failed to stop productivity tracking:', error);
    }
  };

  const trackActivity = async () => {
    try {
      // Simulate activity tracking (in real app, this would capture actual user activity)
      const simulatedActivity = {
        keystroke_count: Math.floor(Math.random() * 50),
        mouse_clicks: Math.floor(Math.random() * 20),
        mouse_movements: Math.floor(Math.random() * 100),
        movement_distance: Math.random() * 1000,
        typing_speed: 40 + Math.random() * 40,
        active_application: getCurrentApplication(),
        current_url: getCurrentUrl()
      };

      const response = await productivityAPI.updateActivity(timeEntryId, simulatedActivity);
      
      if (response.data.success) {
        setTrackingState(prev => ({
          ...prev,
          activityLevel: response.data.activity_level,
          productivityLevel: response.data.productivity_level,
          recommendations: response.data.recommendations,
          keystrokeCount: prev.keystrokeCount + simulatedActivity.keystroke_count,
          mouseClicks: prev.mouseClicks + simulatedActivity.mouse_clicks,
          currentApp: simulatedActivity.active_application
        }));
      }
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  };

  const captureScreenshot = async () => {
    try {
      // Simulate screenshot capture (in real app, this would capture actual screen)
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // Create a simple gradient as simulation
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#4f46e5');
      gradient.addColorStop(1, '#7c3aed');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      
      // Add some text to simulate screen content
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.fillText('Productivity Screenshot Simulation', 200, 300);
      
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('screenshot', blob, 'screenshot.png');
        formData.append('time_entry_id', timeEntryId);
        formData.append('activity_level', trackingState.activityLevel.toString());

        const response = await productivityAPI.uploadScreenshot(formData);
        
        if (response.data.success) {
          setTrackingState(prev => ({
            ...prev,
            lastScreenshot: new Date()
          }));
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  const getCurrentApplication = () => {
    // Simulate current application detection
    const apps = ['VSCode', 'Chrome', 'Slack', 'Terminal', 'Figma', 'Notion'];
    return apps[Math.floor(Math.random() * apps.length)];
  };

  const getCurrentUrl = () => {
    // Simulate current URL detection
    const urls = [
      'https://github.com/project',
      'https://stackoverflow.com/questions',
      'https://docs.python.org',
      'https://localhost:3000',
      'https://google.com/search'
    ];
    return urls[Math.floor(Math.random() * urls.length)];
  };

  const handleConsentGiven = async () => {
    try {
      await productivityAPI.recordConsent(true);
      setIsConsentGiven(true);
      setShowConsentModal(false);
    } catch (error) {
      console.error('Failed to record consent:', error);
    }
  };

  const getProductivityColor = (level) => {
    switch (level) {
      case 'very_high': return 'text-green-600 bg-green-100';
      case 'high': return 'text-green-500 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      case 'very_low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityLevelColor = (level) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 60) return 'text-blue-600';
    if (level >= 40) return 'text-yellow-600';
    if (level >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  // Show consent modal on first use
  useEffect(() => {
    if (isTracking && !isConsentGiven) {
      setShowConsentModal(true);
    }
  }, [isTracking, isConsentGiven]);

  if (!isTracking || !isConsentGiven) {
    return (
      <>
        {showConsentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Productivity Tracking Consent</h3>
              <p className="text-gray-600 mb-4">
                We'd like to track your productivity during work hours to help improve team efficiency. 
                This includes capturing screenshots, monitoring keyboard/mouse activity, and tracking application usage.
              </p>
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">What we track:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Screenshots at regular intervals (can be blurred)</li>
                  <li>• Keyboard and mouse activity levels</li>
                  <li>• Application and website usage</li>
                  <li>• Activity patterns and productivity metrics</li>
                </ul>
              </div>
              <div className="bg-green-50 p-3 rounded-md mb-4">
                <h4 className="font-medium text-green-800 mb-2">Privacy protections:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Data is only visible to organization admins</li>
                  <li>• Screenshots can be automatically blurred</li>
                  <li>• Sensitive content is automatically redacted</li>
                  <li>• You can adjust privacy settings anytime</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleConsentGiven}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  I Consent
                </button>
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Productivity Tracking Paused
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Productivity tracking requires your consent. Click to review and enable tracking features.
              </p>
              <button
                onClick={() => setShowConsentModal(true)}
                className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                Review Tracking Settings
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Productivity Tracking
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">Active</span>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getActivityLevelColor(trackingState.activityLevel)}`}>
            {trackingState.activityLevel.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Activity Level</div>
        </div>
        
        <div className="text-center">
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getProductivityColor(trackingState.productivityLevel)}`}>
            {trackingState.productivityLevel.replace('_', ' ').toUpperCase()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Productivity</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {trackingState.keystrokeCount}
          </div>
          <div className="text-xs text-gray-500">Keystrokes</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">
            {trackingState.mouseClicks}
          </div>
          <div className="text-xs text-gray-500">Mouse Clicks</div>
        </div>
      </div>

      {/* Current Context */}
      {trackingState.currentApp && (
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <div className="text-sm">
            <span className="text-gray-500">Current App:</span>
            <span className="ml-2 font-medium text-gray-900">{trackingState.currentApp}</span>
          </div>
          {trackingState.lastScreenshot && (
            <div className="text-xs text-gray-500 mt-1">
              Last screenshot: {new Date(trackingState.lastScreenshot).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {trackingState.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Productivity Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {trackingState.recommendations.slice(0, 2).map((rec, index) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings Quick Access */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.screenshotsEnabled}
              onChange={(e) => setSettings(prev => ({...prev, screenshotsEnabled: e.target.checked}))}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="ml-2 text-gray-700">Screenshots</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.keyboardTracking}
              onChange={(e) => setSettings(prev => ({...prev, keyboardTracking: e.target.checked}))}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="ml-2 text-gray-700">Keyboard</span>
          </label>
        </div>
        
        <button
          onClick={() => {/* Open settings modal */}}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          Settings
        </button>
      </div>
    </div>
  );
};

export default ProductivityTracker;