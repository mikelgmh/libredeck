import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock modules before any imports
const mockDbModule = mock.module('../db', () => ({
  initDatabase: mock(async () => {}),
  getDatabase: mock(() => ({})),
  DatabaseService: class MockDatabaseService {
    addLog = mock(() => {});
    getProfiles = mock(() => []);
    getProfile = mock(() => null);
    createProfile = mock(() => {});
    updateProfile = mock(() => {});
    deleteProfile = mock(() => {});
    getLogs = mock(() => []);
  }
}));

const mockPluginLoaderModule = mock.module('../plugin-loader', () => ({
  PluginLoader: class MockPluginLoader {
    loadPlugins = mock(() => []);
    getPlugin = mock(() => null);
  }
}));

import { ActionRunner } from '../action-runner';
import { PluginLoader } from '../plugin-loader';

describe('ActionRunner', () => {
  let actionRunner: ActionRunner;
  let mockPluginLoader: PluginLoader;

  beforeEach(() => {
    mockPluginLoader = new PluginLoader();
    actionRunner = new ActionRunner(mockPluginLoader);
  });

  it('should initialize with plugin loader', () => {
    expect(actionRunner).toBeDefined();
    expect(actionRunner.getNativePlugins()).toBeDefined();
    expect(actionRunner.getNativePlugins().length).toBeGreaterThan(0);
  });

  it('should register action handlers', () => {
    const testHandler = mock(() => ({ success: true }));

    actionRunner.registerAction('test.action', testHandler);

    const stats = actionRunner.getActionStats();
    expect(stats.registered).toBeGreaterThan(0);
  });

  it('should execute a simple action', async () => {
    const testAction = {
      id: 'test-1',
      type: 'utility.delay',
      parameters: { delay: 100 }
    };

    const context = {
      buttonId: 'btn-1',
      profileId: 'profile-1',
      pageId: 'page-1'
    };

    const result = await actionRunner.executeAction(testAction, context);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle unknown action types', async () => {
    const unknownAction = {
      id: 'test-2',
      type: 'unknown.action'
    };

    const context = {
      buttonId: 'btn-1',
      profileId: 'profile-1',
      pageId: 'page-1'
    };

    const result = await actionRunner.executeAction(unknownAction, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown action type');
  });

  it('should prevent double execution of the same action', async () => {
    const longRunningAction = {
      id: 'test-3',
      type: 'utility.delay',
      parameters: { delay: 1000 },
      timeout: 2000
    };

    const context = {
      buttonId: 'btn-1',
      profileId: 'profile-1',
      pageId: 'page-1'
    };

    // Start first execution
    const firstExecution = actionRunner.executeAction(longRunningAction, context);

    // Try to start second execution immediately
    const secondExecution = actionRunner.executeAction(longRunningAction, context);

    const firstResult = await firstExecution;
    const secondResult = await secondExecution;

    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toBe('Action is already running');
  });

  it('should handle action timeouts', async () => {
    const slowAction = {
      id: 'test-4',
      type: 'utility.delay',
      parameters: { delay: 2000 },
      timeout: 100
    };

    const context = {
      buttonId: 'btn-1',
      profileId: 'profile-1',
      pageId: 'page-1'
    };

    const result = await actionRunner.executeAction(slowAction, context);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Action timeout');
  });

  it('should track running actions', () => {
    const runningActions = actionRunner.getRunningActions();
    expect(Array.isArray(runningActions)).toBe(true);
  });

  it('should provide action statistics', () => {
    const stats = actionRunner.getActionStats();
    expect(stats).toBeDefined();
    expect(typeof stats.running).toBe('number');
    expect(typeof stats.registered).toBe('number');
    expect(typeof stats.lastExecutions).toBe('object');
  });

  it('should dispose properly', () => {
    actionRunner.dispose();

    const stats = actionRunner.getActionStats();
    expect(stats.registered).toBe(0);
  });
});