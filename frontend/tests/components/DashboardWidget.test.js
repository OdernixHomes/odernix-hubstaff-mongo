/**
 * DashboardWidget component tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardWidget } from '../../src/components/DashboardWidget';
import { setupTest } from '../setup';

describe('DashboardWidget Component', () => {
  beforeEach(() => {
    setupTest();
  });

  test('renders widget with basic props', () => {
    const props = {
      title: 'Hours Worked',
      value: '40.5h',
      subtitle: 'This month',
      icon: '⏰',
      color: 'blue'
    };

    render(<DashboardWidget {...props} />);

    expect(screen.getByText(props.title)).toBeInTheDocument();
    expect(screen.getByText(props.value)).toBeInTheDocument();
    expect(screen.getByText(props.subtitle)).toBeInTheDocument();
    expect(screen.getByText(props.icon)).toBeInTheDocument();
  });

  test('renders widget with different colors', () => {
    const colors = ['blue', 'green', 'purple', 'orange', 'red'];

    colors.forEach(color => {
      const { container } = render(
        <DashboardWidget
          title="Test Widget"
          value="100"
          subtitle="Test subtitle"
          icon="🧪"
          color={color}
        />
      );

      // Check if the component renders without errors
      expect(screen.getByText('Test Widget')).toBeInTheDocument();
      
      // Clean up for next iteration
      container.remove();
    });
  });

  test('handles numeric values', () => {
    render(
      <DashboardWidget
        title="Active Users"
        value={25}
        subtitle="Right now"
        icon="👥"
        color="green"
      />
    );

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  test('handles string values', () => {
    render(
      <DashboardWidget
        title="Activity Level"
        value="85%"
        subtitle="This week"
        icon="📊"
        color="orange"
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('renders without optional props', () => {
    render(
      <DashboardWidget
        title="Minimal Widget"
        value="Test"
      />
    );

    expect(screen.getByText('Minimal Widget')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});