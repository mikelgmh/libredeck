// Test setup for frontend
import { beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/vue'

// Setup global test environment
beforeAll(() => {
  // Setup test environment variables
  process.env.NODE_ENV = 'test'
})

// Cleanup after each test
afterAll(() => {
  cleanup()
})