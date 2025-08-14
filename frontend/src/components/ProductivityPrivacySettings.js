import React, { useState, useEffect } from 'react';
import { productivityAPI, activityAPI } from '../api/client';

const ProductivityPrivacySettings = ({ user, onClose }) => {
  const [settings, setSettings] = useState({
    screenshot_enabled: true,
    screenshot_interval: 600,
    screenshot_quality: 'medium',
    blur_screenshots: false,
    keystroke_tracking: true,
    application_tracking: true,
    website_tracking: true,
    activity_monitoring: true,
    privacy_mode: false,
    exclude_applications: [],
    exclude_websites: []
  });

  const [consentStatus, setConsentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newExcludeApp, setNewExcludeApp] = useState('');
  const [newExcludeWebsite, setNewExcludeWebsite] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch current monitoring settings
      const settingsResponse = await activityAPI.getMonitoringSettings();
      if (settingsResponse.data) {
        setSettings(settingsResponse.data);
      }
      
      // Check consent status (you might need to add this endpoint)
      // const consentResponse = await productivityAPI.getConsentStatus();
      // setConsentStatus(consentResponse.data);
      
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Update monitoring settings
      await activityAPI.updateMonitoringSettings(settings);
      
      // Show success message
      alert('Privacy settings updated successfully');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConsentChange = async (consentGiven) => {
    try {
      await productivityAPI.recordConsent(consentGiven);
      setConsentStatus(consentGiven);
      
      if (!consentGiven) {
        // If consent is revoked, disable all tracking
        setSettings(prev => ({
          ...prev,
          screenshot_enabled: false,
          keystroke_tracking: false,
          application_tracking: false,
          website_tracking: false,
          activity_monitoring: false
        }));
      }
      
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const addExcludeApp = () => {
    if (newExcludeApp.trim() && !settings.exclude_applications.includes(newExcludeApp.trim())) {
      setSettings(prev => ({
        ...prev,
        exclude_applications: [...prev.exclude_applications, newExcludeApp.trim()]
      }));
      setNewExcludeApp('');
    }
  };

  const removeExcludeApp = (app) => {
    setSettings(prev => ({
      ...prev,
      exclude_applications: prev.exclude_applications.filter(a => a !== app)
    }));
  };

  const addExcludeWebsite = () => {
    if (newExcludeWebsite.trim() && !settings.exclude_websites.includes(newExcludeWebsite.trim())) {
      setSettings(prev => ({
        ...prev,
        exclude_websites: [...prev.exclude_websites, newExcludeWebsite.trim()]
      }));
      setNewExcludeWebsite('');
    }
  };

  const removeExcludeWebsite = (website) => {
    setSettings(prev => ({
      ...prev,
      exclude_websites: prev.exclude_websites.filter(w => w !== website)
    }));
  };

  const enablePrivacyMode = () => {
    setSettings(prev => ({
      ...prev,
      privacy_mode: true,
      blur_screenshots: true,
      screenshot_quality: 'low',
      screenshot_interval: 1200, // 20 minutes
      keystroke_tracking: false
    }));
  };

  const disablePrivacyMode = () => {
    setSettings(prev => ({
      ...prev,
      privacy_mode: false,
      blur_screenshots: false,
      screenshot_quality: 'medium',
      screenshot_interval: 600, // 10 minutes
      keystroke_tracking: true
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-center mt-4">Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Productivity Privacy Settings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Control how your productivity data is collected and monitored
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Consent Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Data Collection Consent</h3>
            <p className="text-blue-700 mb-4">
              Your consent is required for productivity tracking. You can revoke this at any time.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleConsentChange(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  consentStatus === true
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                I Consent to Tracking
              </button>
              <button
                onClick={() => handleConsentChange(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  consentStatus === false
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                Revoke Consent
              </button>
            </div>
          </div>

          {/* Privacy Mode */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Privacy Mode</h3>
                <p className="text-sm text-gray-600">
                  Enhanced privacy settings that reduce data collection and increase protection
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy_mode}
                  onChange={(e) => e.target.checked ? enablePrivacyMode() : disablePrivacyMode()}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {settings.privacy_mode && (
              <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                <p className="font-medium mb-2">Privacy Mode Enabled:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Screenshots are automatically blurred</li>
                  <li>• Screenshot quality reduced to low</li>
                  <li>• Screenshot interval increased to 20 minutes</li>
                  <li>• Keystroke tracking disabled</li>
                  <li>• Enhanced content filtering active</li>
                </ul>
              </div>
            )}
          </div>

          {/* Screenshot Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Screenshot Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.screenshot_enabled}
                    onChange={(e) => setSettings(prev => ({...prev, screenshot_enabled: e.target.checked}))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    disabled={!consentStatus}
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Screenshots</span>
                </label>
                <p className="text-xs text-gray-500 ml-7">Capture screenshots at regular intervals</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.blur_screenshots}
                    onChange={(e) => setSettings(prev => ({...prev, blur_screenshots: e.target.checked}))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    disabled={!settings.screenshot_enabled}
                  />
                  <span className="text-sm font-medium text-gray-700">Blur Screenshots</span>
                </label>
                <p className="text-xs text-gray-500 ml-7">Apply blur filter for privacy protection</p>
              </div>
            </div>

            {settings.screenshot_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screenshot Interval
                  </label>
                  <select
                    value={settings.screenshot_interval}
                    onChange={(e) => setSettings(prev => ({...prev, screenshot_interval: parseInt(e.target.value)}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1200}>20 minutes</option>
                    <option value={1800}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screenshot Quality
                  </label>
                  <select
                    value={settings.screenshot_quality}
                    onChange={(e) => setSettings(prev => ({...prev, screenshot_quality: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="low">Low (smaller file size)</option>
                    <option value="medium">Medium (balanced)</option>
                    <option value="high">High (best quality)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Activity Tracking Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Tracking</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.keystroke_tracking}
                    onChange={(e) => setSettings(prev => ({...prev, keystroke_tracking: e.target.checked}))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    disabled={!consentStatus}
                  />
                  <span className="text-sm font-medium text-gray-700">Keystroke Tracking</span>
                </label>
                <p className="text-xs text-gray-500 ml-7">Monitor typing activity and speed</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.application_tracking}
                    onChange={(e) => setSettings(prev => ({...prev, application_tracking: e.target.checked}))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    disabled={!consentStatus}
                  />
                  <span className="text-sm font-medium text-gray-700">Application Tracking</span>
                </label>
                <p className="text-xs text-gray-500 ml-7">Track which applications you use</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.website_tracking}
                    onChange={(e) => setSettings(prev => ({...prev, website_tracking: e.target.checked}))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    disabled={!consentStatus}
                  />
                  <span className="text-sm font-medium text-gray-700">Website Tracking</span>
                </label>
                <p className="text-xs text-gray-500 ml-7">Monitor website visits and usage</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.activity_monitoring}
                    onChange={(e) => setSettings(prev => ({...prev, activity_monitoring: e.target.checked}))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    disabled={!consentStatus}
                  />
                  <span className="text-sm font-medium text-gray-700">Mouse Activity</span>
                </label>
                <p className="text-xs text-gray-500 ml-7">Track mouse clicks and movements</p>
              </div>
            </div>
          </div>

          {/* Exclusion Lists */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Privacy Exclusions</h3>
            
            {/* Exclude Applications */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Exclude Applications</h4>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newExcludeApp}
                  onChange={(e) => setNewExcludeApp(e.target.value)}
                  placeholder="Application name (e.g., Calculator, Notes)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addExcludeApp()}
                />
                <button
                  onClick={addExcludeApp}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.exclude_applications.map((app, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                  >
                    {app}
                    <button
                      onClick={() => removeExcludeApp(app)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Exclude Websites */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Exclude Websites</h4>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newExcludeWebsite}
                  onChange={(e) => setNewExcludeWebsite(e.target.value)}
                  placeholder="Website domain (e.g., personal-site.com)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addExcludeWebsite()}
                />
                <button
                  onClick={addExcludeWebsite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.exclude_websites.map((website, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                  >
                    {website}
                    <button
                      onClick={() => removeExcludeWebsite(website)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Data Rights Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Your Data Rights</h3>
            <ul className="text-sm text-green-700 space-y-2">
              <li>• <strong>Access:</strong> Request a copy of all your productivity data</li>
              <li>• <strong>Deletion:</strong> Request deletion of your data (account required)</li>
              <li>• <strong>Correction:</strong> Request correction of inaccurate data</li>
              <li>• <strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li>• <strong>Withdraw Consent:</strong> Stop all data collection at any time</li>
            </ul>
            <button className="mt-4 text-sm text-green-800 underline hover:text-green-900">
              Contact Data Protection Officer
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductivityPrivacySettings;