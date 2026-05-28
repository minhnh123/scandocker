import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import '@testing-library/jest-dom';

// Mock ResizeObserver which is used by Recharts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('App Component', () => {
  it('renders without crashing and shows title', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/DockerSec/i);
    expect(titleElements.length).toBeGreaterThan(0);
  });
});
