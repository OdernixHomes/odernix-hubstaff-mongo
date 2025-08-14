import React, { useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const TokenDebug = () => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hubstaff_token');
    const user = localStorage.getItem('hubstaff_user');
    
    setTokenInfo({
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
      hasUser: !!user,
      userData: user ? JSON.parse(user) : null
    });
  }, []);

  const testToken = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      console.log('Testing /auth/me endpoint...');
      const response = await authAPI.getCurrentUser();
      console.log('Token test successful:', response);
      setTestResult({
        success: true,
        data: response.data
      });
    } catch (error) {
      console.error('Token test failed:', error);
      setTestResult({
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔐 Authentication Debug</h3>
      
      <div className="mb-4 text-sm">
        <p><strong>Has Token:</strong> {tokenInfo?.hasToken ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Token Preview:</strong> {tokenInfo?.tokenPreview}</p>
        <p><strong>Has User Data:</strong> {tokenInfo?.hasUser ? '✅ Yes' : '❌ No'}</p>
        {tokenInfo?.userData && (
          <div className="mt-2">
            <strong>User Info:</strong>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(tokenInfo.userData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <button
        onClick={testToken}
        disabled={testing}
        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
      >
        {testing ? 'Testing Token...' : 'Test Token Validity'}
      </button>

      {testResult && (
        <div className={`mt-4 p-4 border rounded ${
          testResult.success 
            ? 'bg-green-100 border-green-300' 
            : 'bg-red-100 border-red-300'
        }`}>
          <h4 className={`font-semibold ${
            testResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {testResult.success ? '✅ Token Valid!' : '❌ Token Invalid!'}
          </h4>
          <pre className={`text-sm mt-2 overflow-x-auto ${
            testResult.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {JSON.stringify(testResult.success ? testResult.data : testResult.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TokenDebug;