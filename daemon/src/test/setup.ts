// Test setup for daemon
import { beforeAll, afterAll } from 'bun:test'

// Setup global test environment
beforeAll(() => {
  // Setup test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = ':memory:'
})

afterAll(() => {
  // Cleanup after all tests
})