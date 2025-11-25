import { openStreamDeck, listStreamDecks, StreamDeck } from '@elgato-stream-deck/node';
import { encodeJPEG } from '@elgato-stream-deck/node-lib';
import { DatabaseService } from '../db';

export class StreamDeckDriver {
  private streamDeck: StreamDeck | null = null;
  private connectedDevice: string | null = null;

  async connect(devicePath?: string): Promise<boolean> {
    try {
      console.log('🔌 Attempting to connect to StreamDeck...');
      
      const devices = await listStreamDecks();
      console.log(`📋 Found ${devices.length} StreamDeck devices:`, devices);

      if (devices.length === 0) {
        console.log('❌ No StreamDeck devices found');
        return false;
      }

      // Use provided device path or first available device
      const targetDevice = devicePath || devices[0].path;
      console.log(`🎯 Connecting to device: ${targetDevice}`);

      if (this.streamDeck) {
        console.log('🔌 Disconnecting existing connection...');
        await this.disconnect();
      }

      console.log('🔌 Opening StreamDeck connection...');
      this.streamDeck = await openStreamDeck(targetDevice);
      this.connectedDevice = targetDevice;

      console.log('✅ StreamDeck connected successfully');
      
      this.setupEventHandlers();
      console.log('🎧 Event handlers set up');

      // Initialize all buttons to red (for testing)
      console.log('🎨 Initializing buttons...');
      await this.initializeButtons();

      console.log(`🎛️ Connected to StreamDeck: ${targetDevice}`);

      // Try to update with current page if available
      // This will be called from the API route after connection
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to StreamDeck:', error);
      console.error('❌ Stack trace:', error.stack);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.streamDeck) {
      this.streamDeck.removeAllListeners();
      await this.streamDeck.close();
      this.streamDeck = null;
      this.connectedDevice = null;
      console.log('Disconnected from StreamDeck');
    }
  }

  private setupEventHandlers(): void {
    if (!this.streamDeck) return;

    this.streamDeck.on('down', async (keyInfo) => {
      // keyInfo might be an object with index property, or just the index number
      const keyIndex = typeof keyInfo === 'object' && keyInfo !== null ? keyInfo.index || keyInfo.keyIndex || 0 : keyInfo;
      console.log(`StreamDeck button ${keyIndex} pressed`);
      await this.handleButtonPress(keyIndex);
    });

    this.streamDeck.on('up', (keyInfo) => {
      const keyIndex = typeof keyInfo === 'object' && keyInfo !== null ? keyInfo.index || keyInfo.keyIndex || 0 : keyInfo;
      console.log(`StreamDeck button ${keyIndex} released`);
    });

    this.streamDeck.on('error', (error) => {
      console.error('StreamDeck error:', error);
    });
  }

  getConnectedDevice(): string | null {
    return this.connectedDevice;
  }

  isConnected(): boolean {
    return this.streamDeck !== null;
  }

  async setButtonColor(keyIndex: number, r: number, g: number, b: number): Promise<void> {
    if (!this.streamDeck) {
      console.log(`❌ StreamDeck not connected, cannot set color for button ${keyIndex}`);
      return;
    }

    console.log(`🎨 Setting button ${keyIndex} to color RGB(${r}, ${g}, ${b})`);
    
    try {
      // Try using fillKeyColor first (simpler method)
      console.log(`🔄 Trying fillKeyColor for button ${keyIndex}...`);
      await this.streamDeck.fillKeyColor(keyIndex, r, g, b);
      console.log(`✅ fillKeyColor successful for button ${keyIndex}`);
    } catch (error) {
      console.error(`❌ fillKeyColor failed for button ${keyIndex}:`, error);
      
      // Fallback to fillKeyBuffer with a simple BMP image
      try {
        console.log(`🔄 Generating BMP image for button ${keyIndex}...`);
        const bmpBuffer = this.generateBMPImage(r, g, b);
        console.log(`📸 Generated BMP buffer, size: ${bmpBuffer.length} bytes`);
        
        console.log(`🔄 Calling fillKeyBuffer for button ${keyIndex}...`);
        await this.streamDeck.fillKeyBuffer(keyIndex, bmpBuffer);
        console.log(`✅ fillKeyBuffer with BMP successful for button ${keyIndex}`);
      } catch (fallbackError) {
        console.error(`❌ fillKeyBuffer with BMP also failed for button ${keyIndex}:`, fallbackError);
      }
    }
  }

  async setButtonImage(keyIndex: number, imageBuffer: Buffer): Promise<void> {
    if (this.streamDeck) {
      await this.streamDeck.fillKeyBuffer(keyIndex, imageBuffer);
    }
  }

  async initializeButtons(): Promise<void> {
    if (!this.streamDeck) {
      console.log('❌ StreamDeck not connected, cannot initialize buttons');
      return;
    }

    console.log('🎛️ Initializing all StreamDeck buttons to RED (for testing)...');
    
    try {
      // Set all buttons to RED initially (color known to work with StreamDeck)
      for (let i = 0; i < 15; i++) {
        console.log(`🔄 Initializing button ${i} to RED...`);
        await this.setButtonColor(i, 255, 0, 0);
        console.log(`✅ Button ${i} initialized`);
      }
      console.log('🎛️ StreamDeck buttons initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing StreamDeck buttons:', error);
    }
  }

  generateBMPImage(r: number, g: number, b: number): Buffer {
    const width = 72;
    const height = 72;
    
    // BMP header (simplified 24-bit BMP)
    const headerSize = 54;
    const imageSize = width * height * 3;
    const fileSize = headerSize + imageSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // BMP file header
    buffer.write('BM', 0); // Signature
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize, 10); // Data offset
    
    // BMP info header
    buffer.writeUInt32LE(40, 14); // Header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(height, 22); // Height
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // Bits per pixel
    buffer.writeUInt32LE(0, 30); // Compression
    buffer.writeUInt32LE(imageSize, 34); // Image size
    buffer.writeInt32LE(0, 38); // X pixels per meter
    buffer.writeInt32LE(0, 42); // Y pixels per meter
    buffer.writeUInt32LE(0, 46); // Colors used
    buffer.writeUInt32LE(0, 50); // Important colors
    
    // BMP pixel data (BGR format, bottom-up)
    let offset = headerSize;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        buffer[offset++] = b; // Blue
        buffer[offset++] = g; // Green
        buffer[offset++] = r; // Red
      }
      // BMP rows must be padded to 4-byte boundaries
      // For 72 pixels * 3 bytes = 216 bytes per row
      // 216 % 4 = 0, so no padding needed
    }
    
    return buffer;
  }

  async updateButtonStates(buttonStates: boolean[]): Promise<void> {
    if (!this.streamDeck) {
      console.log('❌ StreamDeck not connected, skipping button update');
      return;
    }

    console.log('🎛️ Updating StreamDeck button states:', buttonStates);

    try {
      for (let i = 0; i < Math.min(buttonStates.length, 15); i++) {
        const hasContent = buttonStates[i];
        if (hasContent) {
          // Azul para botones con contenido (color que funciona bien en StreamDeck)
          await this.setButtonColor(i, 0, 0, 255);
          console.log(`🔵 Set button ${i} to BLUE (has content)`);
        } else {
          // Rojo para botones vacíos (color que funciona bien en StreamDeck)
          await this.setButtonColor(i, 255, 0, 0);
          console.log(`🔴 Set button ${i} to RED (empty)`);
        }
      }

      console.log('✅ StreamDeck button states updated successfully');
    } catch (error) {
      console.error('❌ Error updating StreamDeck buttons:', error);
    }
  }

  async updateFromPage(pageId: string): Promise<void> {
    if (!this.streamDeck) {
      console.log('❌ StreamDeck not connected, skipping page update');
      return;
    }

    console.log(`📄 Updating StreamDeck from page: ${pageId}`);

    try {
      const db = new DatabaseService();
      const buttons = db.getButtonsByPage(pageId);

      console.log(`📊 Found ${buttons.length} buttons in page ${pageId}`);

      // Calculate button states based on content
      const buttonStates: boolean[] = [];
      const maxButtons = 15; // StreamDeck has 15 buttons (5x3 grid)

      for (let i = 0; i < maxButtons; i++) {
        const button = buttons.find(b => b.position === i);
        let hasContent = false;

        if (button && button.data) {
          hasContent = !!(
            button.data.label?.trim() ||
            button.data.textTop?.trim() ||
            button.data.textBottom?.trim() ||
            button.data.emoji?.trim() ||
            button.data.icon ||
            (button.data.actions && button.data.actions.length > 0)
          );

          console.log(`Button ${i}: exists=${!!button}, hasContent=${hasContent}`, {
            label: button.data.label,
            textTop: button.data.textTop,
            textBottom: button.data.textBottom,
            emoji: button.data.emoji,
            icon: button.data.icon,
            actionsCount: button.data.actions?.length || 0
          });
        } else {
          console.log(`Button ${i}: no button data`);
        }

        buttonStates.push(hasContent);
      }

      console.log('🎛️ Button states for page update:', buttonStates);
      await this.updateButtonStates(buttonStates);

    } catch (error) {
      console.error('❌ Error updating StreamDeck from page:', error);
    }
  }

  async updateButtons(buttonStates: boolean[]): Promise<void> {
    console.log('🎛️ Updating StreamDeck buttons with states:', buttonStates);
    await this.updateButtonStates(buttonStates);
  }

  async handleButtonPress(keyIndex: number): Promise<void> {
    try {
      console.log(`🎛️ StreamDeck button ${keyIndex} pressed - executing actions`);

      // Get current profile and page from database
      const db = new DatabaseService();
      
      // Debug: Check what settings are stored
      const currentProfileId = db.getSetting('current.profile_id');
      const currentPageId = db.getSetting('current.page_id');
      console.log(`🔍 Current settings - profile_id: "${currentProfileId}", page_id: "${currentPageId}"`);
      
      // Log current frontend state (if available via WebSocket or other means)
      // Since we can't directly access frontend state, we'll show what should be current
      const allProfiles = db.getProfiles();
      console.log(`👤 Available profiles: ${allProfiles.length}`, allProfiles.map(p => ({ id: p.id, name: p.name })));
      
      // Try to determine what the "current" profile should be
      let expectedProfileId = currentProfileId;
      if (expectedProfileId === 'null' || expectedProfileId === null || expectedProfileId === '') {
        // If invalid, use the first available profile
        if (allProfiles.length > 0) {
          expectedProfileId = allProfiles[0].id;
          console.log(`⚠️ Invalid profile_id in settings, using first available profile: ${expectedProfileId}`);
        }
      }
      
      console.log(`📍 Expected current profile: ${expectedProfileId}`);
      
      // If we need to update settings, do it now
      if (expectedProfileId !== currentProfileId) {
        console.log(`🔧 Auto-correcting invalid profile_id setting to: ${expectedProfileId}`);
        db.setSetting('current.profile_id', expectedProfileId);
      }
      
      // Now try to get the profile with the corrected ID
      const currentProfile = expectedProfileId ? db.getProfile(expectedProfileId) : null;
      console.log(`🔍 Current profile lookup result:`, currentProfile ? `Found profile ${currentProfile.id} (${currentProfile.name})` : 'No profile found');
      
      if (!currentProfile) {
        console.log('❌ No current profile found for StreamDeck button press');
        // List all available profiles for debugging
        console.log(`📋 Available profiles in database: ${allProfiles.length}`, allProfiles.map(p => ({ id: p.id, name: p.name })));
        return;
      }

      // Log current page state
      const allPages = db.getPagesByProfile(currentProfile.id);
      console.log(`📄 Available pages for current profile: ${allPages.length}`, allPages.map(p => ({ id: p.id, name: p.name, is_folder: p.is_folder })));
      
      // Try to determine what the "current" page should be
      let expectedPageId = currentPageId;
      if (expectedPageId === 'null' || expectedPageId === null || expectedPageId === '') {
        // If invalid, use the first non-folder page
        const nonFolderPages = allPages.filter(p => p.is_folder === 0);
        if (nonFolderPages.length > 0) {
          expectedPageId = nonFolderPages[0].id;
          console.log(`⚠️ Invalid page_id in settings, using first non-folder page: ${expectedPageId}`);
        }
      }
      
      console.log(`📍 Expected current page: ${expectedPageId}`);
      
      // If we need to update settings, do it now
      if (expectedPageId !== currentPageId) {
        console.log(`🔧 Auto-correcting invalid page_id setting to: ${expectedPageId}`);
        db.setSetting('current.page_id', expectedPageId);
      }
      
      // Now try to get the page with the corrected ID
      const currentPage = expectedPageId ? db.getPage(expectedPageId) : null;
      // Verify the page belongs to the current profile
      const validCurrentPage = currentPage && currentPage.profile_id === currentProfile.id ? currentPage : null;
      console.log(`🔍 Current page lookup result:`, validCurrentPage ? `Found page ${validCurrentPage.id} (${validCurrentPage.name})` : 'No page found');
      
      if (!validCurrentPage) {
        console.log('❌ No current page found for StreamDeck button press');
        // List all pages for the current profile
        console.log(`📄 Available pages for profile ${currentProfile.id}: ${allPages.length}`, allPages.map(p => ({ id: p.id, name: p.name, is_folder: p.is_folder })));
        return;
      }

      // Find button at the specified position
      const button = db.getButtonsByPage(validCurrentPage.id).find(b => b.position === keyIndex);
      console.log(`🔍 Button lookup at position ${keyIndex}:`, button ? `Found button ${button.id}` : 'No button found');
      
      if (!button) {
        console.log(`❌ No button found at position ${keyIndex}`);
        // List all buttons for debugging
        const allButtons = db.getButtonsByPage(validCurrentPage.id);
        console.log(`🔘 All buttons in page ${validCurrentPage.id}: ${allButtons.length}`, allButtons.map(b => ({ id: b.id, position: b.position, hasData: !!b.data })));
        return;
      }

      if (!button.data?.actions || button.data.actions.length === 0) {
        console.log(`⚠️ Button at position ${keyIndex} has no actions to execute`);
        return;
      }

      console.log(`🔘 Executing ${button.data.actions.length} actions for button at position ${keyIndex}`);

      // Execute each action using the existing API endpoint
      for (const action of button.data.actions) {
        try {
          console.log(`▶️ Executing action: ${action.type}`);

          const response = await fetch('http://localhost:3001/api/v1/actions/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action,
              context: {
                buttonId: button.id,
                pageId: validCurrentPage.id,
                profileId: currentProfile.id,
                position: keyIndex,
                source: 'streamdeck'
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to execute action ${action.type}: ${response.status} ${errorText}`);
          } else {
            const result = await response.json();
            console.log(`✅ Action executed successfully: ${action.type}`, result);
          }
        } catch (error) {
          console.error(`❌ Error executing action ${action.type}:`, error);
        }
      }

      console.log(`✅ Finished executing actions for StreamDeck button ${keyIndex}`);
    } catch (error) {
      console.error(`❌ Error handling StreamDeck button press ${keyIndex}:`, error);
    }
  }
}

// Singleton instance
export const streamDeckDriver = new StreamDeckDriver();