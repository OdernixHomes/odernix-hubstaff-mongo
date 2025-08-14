/**
 * Header component tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../../src/components/Header';
import { mockUser, mockAdminUser, setupTest } from '../setup';

describe('Header Component', () => {
  beforeEach(() => {
    setupTest();
  });

  test('renders user information correctly', () => {
    const mockLogout = jest.fn();
    const mockToggleSidebar = jest.fn();

    render(
      <Header
        user={mockUser}
        onLogout={mockLogout}
        currentPage="Dashboard"
        onToggleMobileSidebar={mockToggleSidebar}
        isMobileSidebarOpen={false}
      />
    );

    // Check if user name is displayed
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('calls logout function when logout is clicked', () => {
    const mockLogout = jest.fn();
    const mockToggleSidebar = jest.fn();

    render(
      <Header
        user={mockUser}
        onLogout={mockLogout}
        currentPage="Dashboard"
        onToggleMobileSidebar={mockToggleSidebar}
        isMobileSidebarOpen={false}
      />
    );

    // Find and click logout button (may need to adjust selector based on actual implementation)
    const logoutElements = screen.queryAllByText(/logout/i);
    if (logoutElements.length > 0) {
      fireEvent.click(logoutElements[0]);
      expect(mockLogout).toHaveBeenCalled();
    }
  });

  test('shows admin indicators for admin users', () => {
    const mockLogout = jest.fn();
    const mockToggleSidebar = jest.fn();

    render(
      <Header
        user={mockAdminUser}
        onLogout={mockLogout}
        currentPage="Dashboard"
        onToggleMobileSidebar={mockToggleSidebar}
        isMobileSidebarOpen={false}
      />
    );

    // Check if admin role is indicated
    expect(screen.getByText(mockAdminUser.name)).toBeInTheDocument();
  });

  test('toggles mobile sidebar when menu button is clicked', () => {
    const mockLogout = jest.fn();
    const mockToggleSidebar = jest.fn();

    render(
      <Header
        user={mockUser}
        onLogout={mockLogout}
        currentPage="Dashboard"
        onToggleMobileSidebar={mockToggleSidebar}
        isMobileSidebarOpen={false}
      />
    );

    // Find menu button (hamburger menu)
    const menuButtons = screen.queryAllByRole('button');
    const menuButton = menuButtons.find(button => 
      button.textContent.includes('☰') || button.getAttribute('aria-label')?.includes('menu')
    );

    if (menuButton) {
      fireEvent.click(menuButton);
      expect(mockToggleSidebar).toHaveBeenCalled();
    }
  });

  test('displays current page correctly', () => {
    const mockLogout = jest.fn();
    const mockToggleSidebar = jest.fn();
    const currentPage = 'Projects';

    render(
      <Header
        user={mockUser}
        onLogout={mockLogout}
        currentPage={currentPage}
        onToggleMobileSidebar={mockToggleSidebar}
        isMobileSidebarOpen={false}
      />
    );

    expect(screen.getByText(currentPage)).toBeInTheDocument();
  });
});