/**
 * LoginPage component tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginPage } from '../../src/pages/LoginPage';
import { mockApiResponse, mockApiError, setupTest } from '../setup';

// Mock the API client
jest.mock('../../src/api/client', () => ({
  authAPI: {
    login: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    setupTest();
    mockNavigate.mockClear();
  });

  test('renders login form', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('handles form input changes', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('submits form with valid credentials', async () => {
    const { authAPI } = require('../../src/api/client');
    const mockLoginResponse = {
      access_token: 'mock-token',
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      },
    };

    authAPI.login.mockResolvedValue(mockApiResponse(mockLoginResponse));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('displays error message on login failure', async () => {
    const { authAPI } = require('../../src/api/client');
    authAPI.login.mockRejectedValue({
      response: mockApiError('Invalid credentials', 401),
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    const { authAPI } = require('../../src/api/client');
    // Create a promise that we can resolve manually
    let resolveLogin;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    authAPI.login.mockReturnValue(loginPromise);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check if loading state is shown
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();

    // Resolve the promise to finish the test
    resolveLogin(mockApiResponse({ access_token: 'token', user: {} }));
  });

  test('validates required fields', async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // Should show validation messages or prevent submission
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput.validity.valid).toBe(false);
    expect(passwordInput.validity.valid).toBe(false);
  });

  test('contains links to other pages', () => {
    render(<LoginPage />);

    // Check for signup link
    const signupLink = screen.getByText(/don't have an account/i).closest('a') ||
                      screen.getByText(/sign up/i);
    expect(signupLink).toBeInTheDocument();

    // Check for forgot password link
    const forgotPasswordLink = screen.getByText(/forgot.*password/i);
    expect(forgotPasswordLink).toBeInTheDocument();
  });

  test('handles remember me checkbox', () => {
    render(<LoginPage />);

    const rememberMeCheckbox = screen.queryByLabelText(/remember me/i);
    if (rememberMeCheckbox) {
      fireEvent.click(rememberMeCheckbox);
      expect(rememberMeCheckbox.checked).toBe(true);
    }
  });
});