import { WebSocketManager } from '../ws';
import { PluginLoader } from '../plugin-loader';
import { ActionRunner } from '../action-runner';
import { windowWatcher } from '../window-watcher';
import { DatabaseService } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getSystemMetricsScript } from '../scripts/system-metrics.ps1';
import { join } from 'path';
import { readdir } from 'fs/promises';

interface APIServices {
  wsManager: WebSocketManager;
  pluginLoader: PluginLoader;
  actionRunner: ActionRunner;
  windowWatcher: typeof windowWatcher;
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
    // Test endpoint for connectivity
    if (path === '/api/v1/test') {
      if (method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          message: 'Daemon is running',
          timestamp: Date.now()
        })
      }
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
          is_folder: body.is_folder || 0,
          data: body.data || {}
        };

        try {
          db.createPage(page);
          services.wsManager.broadcastPageCreated(page.id, page);

          return jsonResponse(page, 201);
        } catch (error) {
          if (error instanceof Error && error.message.includes('already exists')) {
            return jsonResponse({ error: error.message }, 409);
          }
          throw error;
        }
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

      if (method === 'PUT') {
        const body = await req.json();
        const page = db.getPage(pageId);
        if (!page) {
          return jsonResponse({ error: 'Page not found' }, 404);
        }

        try {
          db.updatePage(pageId, body);
          const updatedPage = db.getPage(pageId);
          services.wsManager.broadcast('page.updated', { pageId, page: updatedPage }, 'pages');
          return jsonResponse(updatedPage);
        } catch (error) {
          if (error instanceof Error && error.message.includes('already exists')) {
            return jsonResponse({ error: error.message }, 409);
          }
          throw error;
        }
      }

      if (method === 'DELETE') {
        const page = db.getPage(pageId);
        if (!page) {
          return jsonResponse({ error: 'Page not found' }, 404);
        }

        db.deletePage(pageId);
        services.wsManager.broadcastPageDeleted(pageId);
        return jsonResponse({ success: true });
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

        // Use new complete update function if position is provided
        if (body.position !== undefined) {
          db.updateButtonComplete(buttonId, {
            data: body.data,
            position: body.position
          });
        } else {
          db.updateButton(buttonId, body.data);
        }

        const updatedButton = db.getButton(buttonId);
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

            // Check if this is a page navigation action
            if (result.result && result.result.action === 'navigate_to_page') {
              services.wsManager.broadcast('page.navigate', {
                pageId: result.result.pageId,
                pageName: result.result.pageName,
                context
              }, 'pages');
            }
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
        const loadedPlugins = Array.from(services.pluginLoader.getLoadedPlugins().entries());
        const pluginActions = Array.from(services.pluginLoader.getPluginActions().entries());
        
        // Group actions by plugin
        const pluginsWithActions = loadedPlugins.map(([pluginId, plugin]) => [
          pluginId,
          {
            manifest: plugin.manifest,
            enabled: plugin.enabled,
            actions: pluginActions
              .filter(([actionId]) => actionId.startsWith(`${pluginId}.`))
              .map(([actionId, action]) => [actionId.split('.')[1], action])
          }
        ]);
        
        return jsonResponse(pluginsWithActions);
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

    // Windows monitoring endpoints
    if (path === '/api/v1/windows/active') {
      if (method === 'GET') {
        // Obtener la ventana activa actual usando PowerShell
        const powershellScript = `
          try {
            $code = @"
            [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
            [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
"@
            $win32 = Add-Type -MemberDefinition $code -Name Win32 -Namespace "" -PassThru

            $hwnd = $win32::GetForegroundWindow()
            if ($hwnd -ne 0) {
              $processId = 0
              $win32::GetWindowThreadProcessId($hwnd, [ref]$processId)
              
              $process = $null
              $processName = "Unknown"
              $executablePath = "Unknown"
              
              try {
                $process = Get-Process -Id $processId -ErrorAction Stop
                $processName = $process.Name
                $executablePath = $process.Path
              } catch {
                $processName = "Unknown"
                $executablePath = "Unknown"
              }
              
              $titleBuilder = New-Object System.Text.StringBuilder 256
              $win32::GetWindowText($hwnd, $titleBuilder, $titleBuilder.Capacity) | Out-Null
              
              $windowTitle = $titleBuilder.ToString().Trim()
              if (-not $windowTitle) {
                $windowTitle = "Untitled"
              }
              
              @{
                hwnd = $hwnd.ToString()
                title = $windowTitle
                processId = $processId
                processName = $processName
                executablePath = $executablePath
              } | ConvertTo-Json -Compress
            } else {
              @{ error = "No active window found" } | ConvertTo-Json -Compress
            }
          } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
          }
        `.trim()

        const proc = Bun.spawn({
          cmd: ['powershell.exe', '-Command', powershellScript],
          stdio: ['ignore', 'pipe', 'pipe']
        })

        const output = await new Response(proc.stdout).text()
        const error = await new Response(proc.stderr).text()

        await proc.exited

        if (proc.exitCode === 0 && output.trim()) {
          try {
            // Extract JSON from output (PowerShell might output extra lines)
            const lines = output.trim().split('\n').filter(line => line.trim())
            const jsonLine = lines.find(line => line.trim().startsWith('{') || line.trim().startsWith('@{'))
            
            if (jsonLine) {
              const windowInfo = JSON.parse(jsonLine.trim())
              return jsonResponse(windowInfo)
            } else {
              console.error('No JSON found in PowerShell output for active window')
              return jsonResponse({ error: 'No JSON found in PowerShell output' }, 500)
            }
          } catch (parseError) {
            console.error('Failed to parse window info JSON:', parseError)
            return jsonResponse({ error: 'Failed to parse window info' }, 500)
          }
        } else {
          console.error('PowerShell execution failed for active window')
          return jsonResponse({ error: 'Failed to get active window' }, 500)
        }
      }
    }    if (path === '/api/v1/windows/list') {
      if (method === 'GET') {
        // Obtener lista de todas las ventanas visibles usando PowerShell
        const powershellScript = `
          try {
            Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              using System.Collections.Generic;
              
              public class WindowInfo {
                  public IntPtr HWnd { get; set; }
                  public string Title { get; set; }
                  public uint ProcessId { get; set; }
                  public string ProcessName { get; set; }
                  public string ExecutablePath { get; set; }
              }
              
              public class Win32 {
                  [DllImport("user32.dll")]
                  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
                  
                  [DllImport("user32.dll")]
                  public static extern int GetWindowText(IntPtr hWnd, string lpString, int nMaxCount);
                  
                  [DllImport("user32.dll")]
                  public static extern bool IsWindowVisible(IntPtr hWnd);
                  
                  [DllImport("user32.dll")]
                  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
                  
                  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
              }
"@

            $windows = New-Object System.Collections.Generic.List[PSObject]
            
            $callback = {
              param($hwnd, $lParam)
              
              try {
                if ([Win32]::IsWindowVisible($hwnd)) {
                  $title = New-Object -TypeName "System.Text.StringBuilder" -ArgumentList 256
                  [Win32]::GetWindowText($hwnd, $title, $title.Capacity) | Out-Null
                  
                  if ($title.Length -gt 0) {
                    $processId = 0
                    [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
                    
                    $process = $null
                    try {
                      $process = Get-Process -Id $processId -ErrorAction Stop
                    } catch {
                      # Process might have ended, skip this window
                      return $true
                    }
                    
                    $windows.Add(@{
                      hwnd = $hwnd.ToString()
                      title = $title.ToString()
                      processId = $processId
                      processName = $process.Name
                      executablePath = $process.Path
                    })
                  }
                }
              } catch {
                # Skip problematic windows
              }
              
              return $true
            }
            
            [Win32]::EnumWindows($callback, 0) | Out-Null
            
            # Return JSON array
            $windows | ConvertTo-Json -Compress
          } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json
          }
        `.trim()

        const proc = Bun.spawn({
          cmd: ['powershell.exe', '-Command', powershellScript],
          stdio: ['ignore', 'pipe', 'pipe']
        })

        const output = await new Response(proc.stdout).text()
        const error = await new Response(proc.stderr).text()

        await proc.exited

        if (proc.exitCode === 0 && output.trim()) {
          try {
            const windows = JSON.parse(output.trim())
            return jsonResponse(windows)
          } catch (parseError) {
            return jsonResponse({ error: 'Failed to parse windows list' }, 500)
          }
        } else {
          // Return mock data as fallback
          const mockWindows = [
            {
              hwnd: "12345678",
              title: "Visual Studio Code",
              processId: 1234,
              processName: "Code",
              executablePath: "C:\\Users\\Mikel\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe"
            },
            {
              hwnd: "87654321", 
              title: "Google Chrome",
              processId: 5678,
              processName: "chrome",
              executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            },
            {
              hwnd: "11223344",
              title: "Bloc de notas",
              processId: 9999,
              processName: "notepad",
              executablePath: "C:\\Windows\\System32\\notepad.exe"
            }
          ]
          
          return jsonResponse(mockWindows)
        }
      }
    }

    if (path === '/api/v1/windows/watcher') {
      if (method === 'POST') {
        const body = await req.json()
        const { action, rules } = body

        if (action === 'start' && rules) {
          services.windowWatcher.updateRules(rules)
          
          // Connect window watcher events to WebSocket for profile switching
          services.windowWatcher.on('profile-switch', (profileId: string, window: any) => {
            // Update current profile in window watcher
            services.windowWatcher.setCurrentProfile(profileId);
            services.wsManager?.broadcast('profile.navigate', { profileId }, 'profiles');
          });
          
          services.windowWatcher.startWatching(rules)
          return jsonResponse({ status: 'started' })
        } else if (action === 'stop') {
          services.windowWatcher.stopWatching()
          return jsonResponse({ status: 'stopped' })
        } else if (action === 'update' && rules) {
          services.windowWatcher.updateRules(rules)
          return jsonResponse({ status: 'updated' })
        }
      }

      if (method === 'GET') {
        return jsonResponse({
          isActive: services.windowWatcher.isActive()
        })
      }
    }

    if (path === '/api/v1/system/metrics') {
      if (method === 'GET') {
        try {
          const powershellScript = getSystemMetricsScript();

          const proc = Bun.spawn({
            cmd: ['powershell.exe', '-Command', powershellScript],
            stdio: ['ignore', 'pipe', 'pipe']
          })

          // Set a timeout for the PowerShell execution
          const timeout = setTimeout(() => {
            proc.kill()
          }, 10000) // 10 second timeout

          const output = await new Response(proc.stdout).text()
          const error = await new Response(proc.stderr).text()

          await proc.exited
          clearTimeout(timeout)

          if (proc.exitCode === 0 && output.trim()) {
            try {
              const metrics = JSON.parse(output.trim())

              // Check if we got an error response
              if (metrics.error) {
                // Return mock data as fallback
                const mockMetrics = {
                  cpu: {
                    usage: Math.random() * 100,
                    temperature: 45 + Math.random() * 30
                  },
                  ram: {
                    total: 16,
                    used: 8 + Math.random() * 8,
                    usage: Math.random() * 100
                  },
                  gpu: {
                    usage: Math.random() * 100,
                    temperature: 40 + Math.random() * 20
                  },
                  timestamp: new Date().toISOString()
                }

                return jsonResponse(mockMetrics)
              }

              return jsonResponse(metrics)
            } catch (parseError) {
              return jsonResponse({ error: 'Failed to parse system metrics' }, 500)
            }
          } else {
            // Return mock data as fallback
            const mockMetrics = {
              cpu: {
                usage: Math.random() * 100,
                temperature: 45 + Math.random() * 30
              },
              ram: {
                total: 16,
                used: 8 + Math.random() * 8,
                usage: Math.random() * 100
              },
              gpu: {
                usage: Math.random() * 100,
                temperature: 40 + Math.random() * 20
              },
              timestamp: new Date().toISOString()
            }

            return jsonResponse(mockMetrics)
          }
        } catch (error) {
          // Final fallback to mock data
          const mockMetrics = {
            cpu: {
              usage: Math.random() * 100,
              temperature: 45 + Math.random() * 30
            },
            ram: {
              total: 16,
              used: 8 + Math.random() * 8,
              usage: Math.random() * 100
            },
            gpu: {
              usage: Math.random() * 100,
              temperature: 40 + Math.random() * 20
            },
            timestamp: new Date().toISOString()
          }

          return jsonResponse(mockMetrics)
        }
      }
    }

    // Version endpoints
    if (path === '/api/v1/version') {
      if (method === 'GET') {
        try {
          // Read version from package.json
          const packageJsonPath = join(__dirname, '..', '..', 'package.json');
          const packageJson = await Bun.file(packageJsonPath).json();
          const currentVersion = packageJson.version || '0.1.0';

          return jsonResponse({
            version: currentVersion,
            buildDate: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to read version:', error);
          return jsonResponse({ error: 'Failed to read version' }, 500);
        }
      }
    }

    if (path === '/api/v1/version/check') {
      if (method === 'GET') {
        try {
          // Get current version
          const packageJsonPath = join(__dirname, '..', '..', 'package.json');
          const packageJson = await Bun.file(packageJsonPath).json();
          const currentVersion = packageJson.version || '0.1.0';

          // Check GitHub for latest release
          const response = await fetch('https://api.github.com/repos/mikelgmh/libredeck/releases/latest', {
            headers: {
              'User-Agent': 'LibreDeck-Updater'
            }
          });

          if (!response.ok) {
            return jsonResponse({ error: 'Failed to check for updates' }, 500);
          }

          const latestRelease = await response.json();
          const latestVersion = latestRelease.tag_name.replace('v', '');

          // Compare versions (simple string comparison for now)
          const hasUpdate = latestVersion !== currentVersion;

          return jsonResponse({
            currentVersion,
            latestVersion,
            hasUpdate,
            releaseUrl: latestRelease.html_url,
            releaseNotes: latestRelease.body,
            publishedAt: latestRelease.published_at
          });
        } catch (error) {
          console.error('Failed to check for updates:', error);
          return jsonResponse({ error: 'Failed to check for updates' }, 500);
        }
      }
    }

    if (path === '/api/v1/update') {
      if (method === 'POST') {
        try {
          // For now, just simulate an update process
          console.log('Starting update simulation...');

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 2000));

          console.log('Update simulation completed!');

          return jsonResponse({
            success: true,
            message: 'Update simulation completed successfully',
            version: '0.2.0',
            requiresRestart: true,
            note: 'This is a simulation. Real update functionality will download and install the latest version from GitHub releases.'
          });

        } catch (error) {
          console.error('Failed to update:', error);
          return jsonResponse({ 
            error: 'Failed to update application', 
            details: error instanceof Error ? error.message : 'Unknown error' 
          }, 500);
        }
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