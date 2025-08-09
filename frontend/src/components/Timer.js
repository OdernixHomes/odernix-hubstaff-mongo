import React, { useState, useEffect } from "react";

export const Timer = ({ activeEntry, onStart, onStop, onReset }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (activeEntry) {
      const startTime = new Date(activeEntry.start_time);
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      setTime(elapsed);
      setIsRunning(true);
    } else {
      setTime(0);
      setIsRunning(false);
    }
  }, [activeEntry]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(time => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await onStart();
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      if (activeEntry) {
        await onStop(activeEntry.id);
        setIsRunning(false);
        setTime(0);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handleReset = () => {
    setTime(0);
    setIsRunning(false);
    onReset();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-gray-900 mb-4 timer-display">
          {formatTime(time)}
        </div>
        <div className="flex justify-center space-x-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 flex items-center btn-primary"
            >
              <span className="mr-2">▶️</span>
              Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 flex items-center"
            >
              <span className="mr-2">⏸️</span>
              Stop
            </button>
          )}
          <button
            onClick={handleReset}
            className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 flex items-center"
          >
            <span className="mr-2">🔄</span>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};