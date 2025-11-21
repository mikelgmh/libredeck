# LibreDeck Auto-Update System

## Overview

LibreDeck includes a built-in automatic update system that can download, install, and restart the application when new versions are available on GitHub.

## How It Works

### 1. Version Checking
- The system reads the current version from `package.json`
- Fetches the latest release information from GitHub API
- Compares versions to determine if an update is needed

### 2. Download Process
- Downloads the ZIP file from the latest GitHub release
- Extracts the archive to a temporary directory
- Verifies that required files are present

### 3. Backup & Installation
- Creates a backup of the current installation
- Replaces existing files with the new version
- Cleans up temporary files

### 4. Restart
- Automatically restarts the application
- The new version becomes active immediately

## Security Measures

### Release Verification
- Only accepts releases from the verified author (`mikelgmh`)
- Only allows stable releases (no drafts or pre-releases)
- Validates that required files are present in the downloaded package

### Backup System
- Creates a complete backup before making any changes
- Automatically restores backup if update fails
- Preserves user data and configurations

### Rollback Capability
- If an update fails, the system attempts to restore from backup
- Users can manually restore from the `backup/` directory if needed

## API Endpoints

### GET `/api/v1/version`
Returns current version information.
```json
{
  "version": "1.0.0",
  "buildDate": "2025-01-19T..."
}
```

### GET `/api/v1/version/check`
Checks for available updates.
```json
{
  "currentVersion": "1.0.0",
  "latestVersion": "1.1.0",
  "hasUpdate": true,
  "releaseUrl": "https://github.com/mikelgmh/libredeck/releases/tag/v1.1.0",
  "releaseNotes": "Release notes...",
  "publishedAt": "2025-01-19T..."
}
```

### POST `/api/v1/update`
Triggers the update process.
```json
{
  "success": true,
  "message": "Update completed successfully. Application will restart in a few seconds.",
  "previousVersion": "1.0.0",
  "newVersion": "1.1.0",
  "restarted": true
}
```

## Manual Update Process

1. Click the "Comprobar actualizaciones" button in the toolbar
2. The system checks for new versions
3. If an update is available, click "Actualizar Ahora"
4. The system will:
   - Download the latest version
   - Create a backup
   - Install the update
   - Restart automatically

## Troubleshooting

### Update Fails
- Check the application logs for error details
- Verify internet connection
- Ensure the application has write permissions

### Restore from Backup
If something goes wrong, you can manually restore:

```bash
# Stop the application
# Copy backup files back
cp -r backup/* .
# Restart the application
```

### Force Update Check
The system checks for updates every 4 hours automatically, but you can manually trigger a check using the toolbar button.

## File Structure

```
libredeck/
├── backup/          # Backup of previous version (created during update)
├── temp/           # Temporary files (cleaned up after update)
├── daemon/         # Backend application
├── web/           # Frontend application
├── package.json   # Version information
└── ...
```

## Development Notes

### Testing Updates
To test the update system without affecting your development environment:

1. Create a test release on GitHub
2. Temporarily modify the version in `package.json`
3. Test the update process
4. Restore from backup if needed

### Release Process
When creating a new release:

1. Ensure all code is committed and tested
2. Update version in `package.json`
3. Create a GitHub release with a ZIP asset
4. The update system will automatically find and install it

## Security Considerations

- Only downloads from official GitHub releases
- Verifies release authenticity
- Creates backups before making changes
- Includes rollback mechanisms
- No automatic updates for pre-releases or drafts

## Future Enhancements

- [ ] Delta updates (only download changed files)
- [ ] Update progress with more detailed feedback
- [ ] Automatic rollback on application startup failure
- [ ] Update channels (stable, beta, nightly)
- [ ] Admin approval for updates in enterprise environments