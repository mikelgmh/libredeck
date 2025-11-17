import { WebSocketManager } from '../ws';
import { PluginLoader } from '../plugin-loader';
import { ActionRunner } from '../action-runner';
import { DatabaseService } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface APIServices {
  wsManager: WebSocketManager;
  pluginLoader: PluginLoader;
  actionRunner: ActionRunner;
}

export async function setupAPIRoutes(
  req: Request,
  services: APIServices
): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  const db = new DatabaseService();

  try {
    // Health endpoint
    if (path === '/api/v1/health') {
      return jsonResponse({
        status: 'ok',
        timestamp: Date.now(),
        version: '0.1.0',
        websocket: {
          clients: services.wsManager.getConnectedClients()
        }
      });
    }

    // Profiles endpoints
    if (path === '/api/v1/profiles') {
      if (method === 'GET') {
        const profiles = db.getProfiles();
        return jsonResponse(profiles);
      }

      if (method === 'POST') {
        const body = await req.json();
        const profile = {
          id: uuidv4(),
          name: body.name,
          data: body.data || {}
        };

        const createdProfile = db.createProfile(profile);
        services.wsManager.broadcastProfileUpdate(profile.id, createdProfile);

        return jsonResponse(createdProfile, 201);
      }
    }

    if (path.startsWith('/api/v1/profiles/')) {
      const profileId = path.split('/')[4];

      if (method === 'GET') {
        const profile = db.getProfile(profileId);
        if (!profile) {
          return jsonResponse({ error: 'Profile not found' }, 404);
        }
        return jsonResponse(profile);
      }

      if (method === 'PUT') {
        const body = await req.json();
        db.updateProfile(profileId, body);

        const updatedProfile = db.getProfile(profileId);
        services.wsManager.broadcastProfileUpdate(profileId, updatedProfile);

        return jsonResponse(updatedProfile);
      }

      if (method === 'DELETE') {
        db.deleteProfile(profileId);
        services.wsManager.broadcast('profile.deleted', { profileId });
        return jsonResponse({ success: true });
      }
    }

    // Pages endpoints
    if (path === '/api/v1/pages') {
      if (method === 'GET') {
        const profileId = url.searchParams.get('profileId');
        if (!profileId) {
          return jsonResponse({ error: 'profileId parameter required' }, 400);
        }

        const pages = db.getPagesByProfile(profileId);
        return jsonResponse(pages);
      }

      if (method === 'POST') {
        const body = await req.json();
        const page = {
          id: uuidv4(),
          profile_id: body.profile_id,
          name: body.name,
          order_idx: body.order_idx || 0,
          data: body.data || {}
        };

        db.createPage(page);
        services.wsManager.broadcastPageUpdate(page.id, page);

        return jsonResponse(page, 201);
      }
    }

    if (path.startsWith('/api/v1/pages/')) {
      const pageId = path.split('/')[4];

      if (method === 'GET') {
        const page = db.getPage(pageId);
        if (!page) {
          return jsonResponse({ error: 'Page not found' }, 404);
        }
        return jsonResponse(page);
      }
    }

    // Buttons endpoints
    if (path === '/api/v1/buttons') {
      if (method === 'GET') {
        const pageId = url.searchParams.get('pageId');
        if (!pageId) {
          return jsonResponse({ error: 'pageId parameter required' }, 400);
        }

        const buttons = db.getButtonsByPage(pageId);
        return jsonResponse(buttons);
      }

      if (method === 'POST') {
        const body = await req.json();
        const button = {
          id: uuidv4(),
          page_id: body.page_id,
          position: body.position,
          data: body.data || {}
        };

        db.createButton(button);
        services.wsManager.broadcast('button.created', { buttonId: button.id, button }, 'buttons');

        return jsonResponse(button, 201);
      }
    }

    if (path.startsWith('/api/v1/buttons/')) {
      const buttonId = path.split('/')[4];

      if (method === 'GET') {
        const button = db.getButton(buttonId);
        if (!button) {
          return jsonResponse({ error: 'Button not found' }, 404);
        }
        return jsonResponse(button);
      }

      if (method === 'PUT') {
        const body = await req.json();

        console.log(`📝 Updating button ${buttonId}:`, body);

        // Use new complete update function if position is provided
        if (body.position !== undefined) {
          console.log(`🔄 Position update: ${buttonId} → position ${body.position}`);
          db.updateButtonComplete(buttonId, {
            data: body.data,
            position: body.position
          });
        } else {
          console.log(`📄 Data-only update: ${buttonId}`);
          db.updateButton(buttonId, body.data);
        }

        const updatedButton = db.getButton(buttonId);
        console.log(`✅ Button updated:`, updatedButton);
        services.wsManager.broadcastButtonUpdate(buttonId, updatedButton);

        return jsonResponse(updatedButton);
      }

      if (method === 'DELETE') {
        const button = db.getButton(buttonId);
        if (!button) {
          return jsonResponse({ error: 'Button not found' }, 404);
        }

        db.deleteButton(buttonId);
        services.wsManager.broadcastButtonDeleted(buttonId);

        return jsonResponse({ success: true });
      }
    }

    // Actions endpoints
    if (path === '/api/v1/actions/execute') {
      if (method === 'POST') {
        const body = await req.json();
        const { action, context } = body;

        const actionId = uuidv4();
        services.wsManager.broadcastActionStarted(actionId, { action, context });

        try {
          const result = await services.actionRunner.executeAction(action, {
            ...context,
            timestamp: Date.now()
          });

          if (result.success) {
            services.wsManager.broadcastActionFinished(actionId, result);
          } else {
            services.wsManager.broadcastActionError(actionId, result.error);
          }

          return jsonResponse(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          services.wsManager.broadcastActionError(actionId, errorMessage);

          return jsonResponse({
            success: false,
            error: errorMessage
          }, 500);
        }
      }
    }

    if (path === '/api/v1/actions/running') {
      if (method === 'GET') {
        const runningActions = services.actionRunner.getRunningActions();
        return jsonResponse(runningActions);
      }
    }

    if (path === '/api/v1/actions/stats') {
      if (method === 'GET') {
        const stats = services.actionRunner.getActionStats();
        return jsonResponse(stats);
      }
    }

    // Plugins endpoints
    if (path === '/api/v1/plugins') {
      if (method === 'GET') {
        const plugins = db.getPlugins();
        const loadedPlugins = Array.from(services.pluginLoader.getLoadedPlugins().entries());

        return jsonResponse({
          installed: plugins,
          loaded: loadedPlugins.map(([id, plugin]) => ({
            id,
            manifest: plugin.manifest,
            enabled: plugin.enabled
          }))
        });
      }
    }

    if (path === '/api/v1/plugins/actions') {
      if (method === 'GET') {
        const actions = Array.from(services.pluginLoader.getPluginActions().entries());
        return jsonResponse(actions);
      }
    }

    // Assets endpoints  
    if (path === '/api/v1/assets') {
      if (method === 'POST') {
        // TODO: Implement file upload
        return jsonResponse({ error: 'Asset upload not implemented yet' }, 501);
      }
    }

    // Logs endpoints
    if (path === '/api/v1/logs') {
      if (method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const level = url.searchParams.get('level') || undefined;

        const logs = db.getLogs(limit, level);
        return jsonResponse(logs);
      }
    }

    // Settings endpoints
    if (path === '/api/v1/settings') {
      if (method === 'GET') {
        const key = url.searchParams.get('key');
        if (key) {
          const value = db.getSetting(key);
          return jsonResponse({ key, value });
        }
        // TODO: Return all settings (needs implementation in DB)
        return jsonResponse({});
      }

      if (method === 'POST') {
        const body = await req.json();
        const { key, value } = body;

        if (!key || value === undefined) {
          return jsonResponse({ error: 'key and value required' }, 400);
        }

        db.setSetting(key, value);
        return jsonResponse({ key, value });
      }
    }

    // 404 - Route not found
    return jsonResponse({ error: 'API endpoint not found' }, 404);

  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}