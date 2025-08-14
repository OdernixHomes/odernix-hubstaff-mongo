/**
 * Timer component tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Timer } from '../../src/components/Timer';
import { mockProject, mockApiResponse, setupTest } from '../setup';

// Mock the API client
jest.mock('../../src/api/client', () => ({
  timeTrackingAPI: {
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    getActiveEntry: jest.fn(),
  },
}));

describe('Timer Component', () => {
  beforeEach(() => {
    setupTest();
  });

  test('renders timer in stopped state', () => {
    render(<Timer projects={[mockProject]} />);

    // Should show start button
    expect(screen.getByText(/start/i)).toBeInTheDocument();
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  test('displays project selection dropdown', () => {
    render(<Timer projects={[mockProject]} />);

    // Should show project selection
    expect(screen.getByText(/project/i)).toBeInTheDocument();
    expect(screen.getByText(mockProject.name)).toBeInTheDocument();
  });

  test('starts timer when start button is clicked', async () => {
    const { timeTrackingAPI } = require('../../src/api/client');
    timeTrackingAPI.startTracking.mockResolvedValue(
      mockApiResponse({
        id: 'test-entry-id',
        project_id: mockProject.id,
        status: 'active',
        start_time: new Date().toISOString(),
      })
    );

    render(<Timer projects={[mockProject]} />);

    const startButton = screen.getByText(/start/i);
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(timeTrackingAPI.startTracking).toHaveBeenCalled();
    });
  });

  test('shows description input field', () => {
    render(<Timer projects={[mockProject]} />);

    const descriptionInput = screen.getByPlaceholderText(/what are you working on/i);
    expect(descriptionInput).toBeInTheDocument();

    // Test typing in description
    fireEvent.change(descriptionInput, { target: { value: 'Working on tests' } });
    expect(descriptionInput.value).toBe('Working on tests');
  });

  test('handles timer with active entry', async () => {
    const { timeTrackingAPI } = require('../../src/api/client');
    timeTrackingAPI.getActiveEntry.mockResolvedValue(
      mockApiResponse({
        id: 'active-entry-id',
        project_id: mockProject.id,
        status: 'active',
        start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        description: 'Test task',
      })
    );

    render(<Timer projects={[mockProject]} />);

    // Wait for the active entry to load
    await waitFor(() => {
      expect(timeTrackingAPI.getActiveEntry).toHaveBeenCalled();
    });
  });

  test('handles project selection', () => {
    const projects = [
      mockProject,
      {
        ...mockProject,
        id: 'project-2',
        name: 'Another Project',
      },
    ];

    render(<Timer projects={projects} />);

    // Should show both projects in selection
    expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    expect(screen.getByText('Another Project')).toBeInTheDocument();
  });

  test('displays timer formatting correctly', () => {
    render(<Timer projects={[mockProject]} />);

    // Initial state should show 00:00:00
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  test('handles empty projects array', () => {
    render(<Timer projects={[]} />);

    // Should still render without crashing
    expect(screen.getByText(/start/i)).toBeInTheDocument();
  });
});