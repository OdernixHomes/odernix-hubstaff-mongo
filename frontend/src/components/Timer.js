import React, { useState, useEffect } from "react";

export const Timer = ({ activeEntry, onStart, onStop, onPause, onResume, onReset }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeEntry) {
      // Parse the start_time properly - it might be in ISO format or local time
      let startTime;
      try {
        startTime = new Date(activeEntry.start_time);
        // Check if the date is valid
        if (isNaN(startTime.getTime())) {
          console.error('Invalid start_time format:', activeEntry.start_time);
          startTime = new Date(); // Fallback to current time
        }
      } catch (error) {
        console.error('Error parsing start_time:', error, activeEntry.start_time);
        startTime = new Date(); // Fallback to current time
      }
      
      const now = new Date();
      let elapsed = Math.floor((now - startTime) / 1000);
      
      // Subtract total pause duration from elapsed time
      const totalPauseDuration = activeEntry.total_pause_duration || 0;
      elapsed = Math.max(0, elapsed - totalPauseDuration);
      
      // If currently paused, subtract current pause duration
      const currentlyPaused = activeEntry.is_paused || false;
      if (currentlyPaused && activeEntry.pause_periods && activeEntry.pause_periods.length > 0) {
        const lastPause = activeEntry.pause_periods[activeEntry.pause_periods.length - 1];
        if (lastPause && lastPause.pause_time && !lastPause.resume_time) {
          const pauseStart = new Date(lastPause.pause_time);
          const currentPauseDuration = Math.floor((now - pauseStart) / 1000);
          elapsed = Math.max(0, elapsed - currentPauseDuration);
        }
      }
      
      // Ensure elapsed time is reasonable (not more than 24 hours)
      const safeElapsed = Math.max(0, Math.min(elapsed, 86400)); // Cap at 24 hours
      
      console.log('Timer calculation:', {
        startTime: startTime.toISOString(),
        now: now.toISOString(),
        rawElapsed: Math.floor((now - startTime) / 1000),
        totalPauseDuration,
        currentlyPaused,
        finalElapsed: safeElapsed
      });
      
      setTime(safeElapsed);
      setIsRunning(true);
      setIsPaused(currentlyPaused);
    } else {
      setTime(0);
      setIsRunning(false);
      setIsPaused(false);
    }
  }, [activeEntry]);

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime(time => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await onStart();
      // Timer state will be updated by useEffect when activeEntry changes
    } catch (error) {
      console.error('Failed to start timer:', error);
      alert('Failed to start timer. Please try again.');
    }
  };

  const handleStop = async () => {
    try {
      if (activeEntry) {
        await onStop(activeEntry.id);
        // Timer state will be updated by useEffect when activeEntry changes
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
      alert('Failed to stop timer. Please try again.');
    }
  };

  const handlePause = async () => {
    try {
      if (activeEntry && !isPaused) {
        await onPause(activeEntry.id);
        // Timer state will be updated by useEffect when activeEntry changes
      }
    } catch (error) {
      console.error('Failed to pause timer:', error);
      alert('Failed to pause timer. Please try again.');
    }
  };

  const handleResume = async () => {
    try {
      if (activeEntry && isPaused) {
        await onResume(activeEntry.id);
        // Timer state will be updated by useEffect when activeEntry changes
      }
    } catch (error) {
      console.error('Failed to resume timer:', error);
      alert('Failed to resume timer. Please try again.');
    }
  };

  const handleReset = () => {
    if (!isRunning) {
      setTime(0);
      onReset();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="text-center">
        <div className={`text-4xl font-mono font-bold mb-4 timer-display ${
          isPaused ? 'text-yellow-600' : 'text-gray-900'
        }`}>
          {formatTime(time)}
        </div>
        {isPaused && (
          <div className="text-yellow-600 font-semibold mb-4 flex items-center justify-center">
            <span className="mr-2">⏸️</span>
            Timer Paused
          </div>
        )}
        <div className="flex justify-center space-x-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 flex items-center btn-primary"
            >
              <span className="mr-2">▶️</span>
              Start
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={handleResume}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <span className="mr-2">▶️</span>
                  Resume
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-md hover:bg-yellow-700 flex items-center"
                >
                  <span className="mr-2">⏸️</span>
                  Pause
                </button>
              )}
              <button
                onClick={handleStop}
                className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 flex items-center"
              >
                <span className="mr-2">⏹️</span>
                Stop
              </button>
            </>
          )}
          <button
            onClick={handleReset}
            className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 flex items-center"
            disabled={isRunning}
          >
            <span className="mr-2">🔄</span>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};