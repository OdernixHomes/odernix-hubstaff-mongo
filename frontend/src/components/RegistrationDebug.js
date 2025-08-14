import React, { useState } from 'react';
import { organizationAPI } from '../api/client';

const RegistrationDebug = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testRegistration = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    const testData = {
      organization_name: "Debug Test Org",
      organization_domain: "debug-test",
      admin_name: "Debug User",
      admin_email: "debug@test.com",
      admin_password: "DebugPass123",
      plan: "free",
      accept_terms: true,
      accept_privacy: true
    };

    try {
      console.log('Testing registration with:', testData);
      const response = await organizationAPI.register(testData);
      console.log('Registration response:', response);
      setResult(response.data);
    } catch (err) {
      console.error('Registration error:', err);
      setError({
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Registration Debug Tool</h3>
      <div className="mb-4 text-sm text-gray-600">
        <p><strong>API URL:</strong> {process.env.REACT_APP_BACKEND_URL || 'Not set'}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      </div>
      
      <button
        onClick={testRegistration}
        disabled={testing}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Organization Registration'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded">
          <h4 className="font-semibold text-green-800">Success!</h4>
          <pre className="text-sm text-green-700 mt-2 overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
          <h4 className="font-semibold text-red-800">Error!</h4>
          <p className="text-sm text-red-700 mt-1"><strong>Message:</strong> {error.message}</p>
          {error.status && <p className="text-sm text-red-700"><strong>Status:</strong> {error.status}</p>}
          {error.response && (
            <pre className="text-sm text-red-700 mt-2 overflow-x-auto">
              {JSON.stringify(error.response, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrationDebug;