const fs = require('fs');
const path = require('path');
const db = require('./database');

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.actions = new Map();
    this.variables = new Map();
    this.driversPath = path.join(__dirname, 'drivers');
  }

  setVariable(pluginId, key, value) {
    const fullKey = `${pluginId}.${key}`;
    this.variables.set(fullKey, value);
    
    // Broadcast to UI
    const wsHandler = require('./websocketHandler');
    wsHandler.broadcast({ 
      type: 'VARIABLES_UPDATE', 
      data: Object.fromEntries(this.variables) 
    });
  }

  getVariables() {
    return Object.fromEntries(this.variables);
  }

  async init() {
    if (!fs.existsSync(this.driversPath)) {
      fs.mkdirSync(this.driversPath, { recursive: true });
    }
    this.loadPlugins();
  }

  loadPlugins() {
    console.log('[PluginManager] Scanning for enabled plugins in', this.driversPath);
    const folders = fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    db.db.all('SELECT plugin_id, config_json FROM plugin_configs', [], (err, rows) => {
      if (err) return console.error('[PluginManager] Error fetching plugin configs:', err);
      
      const enabledIds = rows.map(r => r.plugin_id);
      
      for (const folder of folders) {
        try {
          const pluginPath = path.join(this.driversPath, folder, 'index.js');
          if (fs.existsSync(pluginPath)) {
            const tempPlugin = require(pluginPath);
            if (!tempPlugin.id) continue;
            
            // Only load the plugin into memory if the user explicitly added it!
            if (enabledIds.includes(tempPlugin.id)) {
              const row = rows.find(r => r.plugin_id === tempPlugin.id);
              let savedConfig = {};
              if (row && row.config_json) {
                try { savedConfig = JSON.parse(row.config_json); } catch(e) {}
              }
              this.loadPlugin(pluginPath, savedConfig);
            }
          }
        } catch (err) {
          console.error(`[PluginManager] Failed to load plugin from ${folder}:`, err.message);
        }
      }
    });
  }

  loadPlugin(pluginPath, savedConfig) {
    try {
      // Clear require cache for this plugin to ensure fresh load
      delete require.cache[require.resolve(pluginPath)];
      const plugin = require(pluginPath);
      
      if (!plugin.id) {
        console.warn('[PluginManager] Plugin is missing an id property, ignoring.');
        return;
      }
      
      // Store the config directly on the plugin object
      plugin.config = savedConfig || {};
      this.plugins.set(plugin.id, plugin);

      // Register actions
      if (plugin.actions && Array.isArray(plugin.actions)) {
        plugin.actions.forEach(action => {
          this.actions.set(`${plugin.id}:${action.id}`, { ...action, pluginId: plugin.id });
        });
      }

      // Execute onLoad hook
      if (plugin.hooks && typeof plugin.hooks.onLoad === 'function') {
        const context = {
          setVariable: (key, value) => {
            this.setVariable(plugin.id, key, value);
          },
          saveConfig: (newConfig) => {
            plugin.config = { ...plugin.config, ...newConfig };
            // Save directly to the DB without reloading the plugin
            const database = require('./database'); // Use the already imported db object
            database.db.run(`INSERT OR REPLACE INTO plugin_configs (plugin_id, config_json) VALUES (?, ?)`, 
              [plugin.id, JSON.stringify(plugin.config)], 
              (err) => {
                if (err) console.error(`[PluginManager] Error saving config from context for ${plugin.id}:`, err);
              }
            );
          }
        };
        
        plugin.hooks.onLoad(plugin.config, context); // Pass config & context!
      }

      console.log(`[PluginManager] Loaded plugin & active hooks: ${plugin.name || plugin.id}`);
      for (const action of plugin.actions) {
        const actionKey = `${plugin.id}:${action.id}`;
        this.actions.set(actionKey, {
          ...action,
          pluginId: plugin.id
        });
      }
    } catch (err) {
      console.error(`[PluginManager] Failed to load plugin at ${pluginPath}:`, err.message);
    }
  }

  async reloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    
    // Only unload if it was actually loaded
    if (plugin) {
      if (plugin.hooks && typeof plugin.hooks.onUnload === 'function') {
        try { plugin.hooks.onUnload(); } catch(e) {}
      }

      // Unregister
      this.plugins.delete(pluginId);
      for (const key of Array.from(this.actions.keys())) {
        if (key.startsWith(`${pluginId}:`)) {
          this.actions.delete(key);
        }
      }
    }

    // Re-register it to trigger the DB fetch and onLoad
    const folders = fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    let foundPath = null;
    for (const folder of folders) {
       const pPath = path.join(this.driversPath, folder, 'index.js');
       if (fs.existsSync(pPath)) {
         const temp = require(pPath);
         if (temp.id === pluginId) {
            foundPath = pPath;
            break;
         }
       }
    }

    if (foundPath) {
       const database = require('./database');
       return new Promise((resolve) => {
         database.db.get('SELECT config_json FROM plugin_configs WHERE plugin_id = ?', [pluginId], (err, row) => {
           let savedConfig = {};
           if (row && row.config_json) {
             try { savedConfig = JSON.parse(row.config_json); } catch(e) {}
           }
           this.loadPlugin(foundPath, savedConfig);
           resolve(true);
         });
       });
    }
    return true;
  }

  getLoadedPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      configSchema: p.configSchema || []
    }));
  }

  getAvailablePlugins() {
    const folders = fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    const available = [];
    for (const folder of folders) {
      try {
        const pPath = path.join(this.driversPath, folder, 'index.js');
        if (fs.existsSync(pPath)) {
          // Clear require cache to safely peek IDs without retaining heavy objects permanently
          delete require.cache[require.resolve(pPath)];
          const temp = require(pPath);
          if (temp.id) {
             available.push({ 
               id: temp.id, 
               name: temp.name || temp.id, 
               description: temp.description || '' 
             });
          }
        }
      } catch (e) {}
    }
    return available;
  }

  executeAction(pluginId, actionId, payload) {
    const actionKey = `${pluginId}:${actionId}`;
    const action = this.actions.get(actionKey);
    
    if (action && typeof action.execute === 'function') {
      console.log(`[PluginManager] Executing action ${actionKey}`);
      try {
        action.execute(payload);
        return true;
      } catch (e) {
        console.error(`[PluginManager] Error executing ${actionKey}:`, e);
        return false;
      }
    } else {
      console.warn(`[PluginManager] Action not found or not executable: ${actionKey}`);
      return false;
    }
  }

  getAvailableActions() {
    return Array.from(this.actions.values()).map(a => ({
      pluginId: a.pluginId,
      actionId: a.id,
      name: a.name,
      fields: a.fields || []
    }));
  }
}

module.exports = new PluginManager();
