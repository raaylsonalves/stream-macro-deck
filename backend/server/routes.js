const express = require('express');
const router = express.Router();
const db = require('../core/database');
const pluginManager = require('../core/pluginManager');

router.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

router.get('/pages', (req, res) => {
  db.db.all('SELECT * FROM pages', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/pages', (req, res) => {
  const { name, type = 'grid', grid_rows = 3, grid_cols = 5 } = req.body;
  db.db.run(
    'INSERT INTO pages (name, type, grid_rows, grid_cols) VALUES (?, ?, ?, ?)',
    [name, type, grid_rows, grid_cols],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
      const wsHandler = require('../core/websocketHandler');
      wsHandler.broadcast({ type: 'FORCE_RELOAD' });
    }
  );
});

router.put('/pages/:id', (req, res) => {
  const pageId = req.params.id;
  const { name, type, grid_rows, grid_cols } = req.body;
  
  db.db.run(
    'UPDATE pages SET name = COALESCE(?, name), type = COALESCE(?, type), grid_rows = COALESCE(?, grid_rows), grid_cols = COALESCE(?, grid_cols) WHERE id = ?',
    [name, type, grid_rows, grid_cols, pageId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const wsHandler = require('../core/websocketHandler');
      wsHandler.broadcast({ type: 'FORCE_RELOAD' });
      
      res.json({ success: true });
    }
  );
});

router.delete('/pages/:id', (req, res) => {
  const pageId = req.params.id;
  db.db.run('DELETE FROM actions WHERE button_id IN (SELECT id FROM buttons WHERE page_id = ?)', [pageId], (err) => {
    db.db.run('DELETE FROM buttons WHERE page_id = ?', [pageId], (err2) => {
      db.db.run('DELETE FROM pages WHERE id = ?', [pageId], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true });
        const wsHandler = require('../core/websocketHandler');
        wsHandler.broadcast({ type: 'FORCE_RELOAD' });
      });
    });
  });
});

router.get('/variables', (req, res) => {
  res.json(pluginManager.getVariables());
});

router.get('/pages/:id/buttons', (req, res) => {
  const pageId = req.params.id;
  db.db.all('SELECT * FROM buttons WHERE page_id = ?', [pageId], (err, buttonsRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (buttonsRow.length === 0) return res.json([]);

    const buttonIds = buttonsRow.map(b => b.id);
    db.db.all(`SELECT * FROM actions WHERE button_id IN (${buttonIds.join(',')}) ORDER BY id ASC`, (err2, actionRows) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const buttons = buttonsRow.map(btn => {
        const btnActions = actionRows.filter(a => a.button_id === btn.id).map(a => {
          let parsedPayload = {};
          try { parsedPayload = JSON.parse(a.payload || '{}'); } catch(e){}
          return {
            id: a.id,
            plugin_id: a.plugin_id,
            action_id: a.action_id,
            payload: parsedPayload
          };
        });

        return { ...btn, actions: btnActions };
      });

      res.json(buttons);
    });
  });
});

router.get('/actions', (req, res) => {
  res.json(pluginManager.getAvailableActions());
});

router.get('/plugins', (req, res) => {
  // Returns list of loaded plugins and their schemas + current configs
  const pluginsInfo = pluginManager.getLoadedPlugins();
  
  db.db.all('SELECT * FROM plugin_configs', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const configMap = {};
    for (const row of rows) {
      try { configMap[row.plugin_id] = JSON.parse(row.config_json); } catch(e){}
    }
    
    const enrichedPlugins = pluginsInfo.map(p => ({
      ...p,
      config: configMap[p.id] || {}
    }));
    
    res.json(enrichedPlugins);
  });
});

router.post('/plugins/:id/config', (req, res) => {
  const pluginId = req.params.id;
  const config = req.body; // config map
  const configJson = JSON.stringify(config);
  
  // Upsert the configuration into DB
  db.db.run(
    'INSERT INTO plugin_configs (plugin_id, config_json) VALUES (?, ?) ON CONFLICT(plugin_id) DO UPDATE SET config_json = excluded.config_json',
    [pluginId, configJson],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Tell plugin manager to reload this plugin with new config!
      pluginManager.reloadPlugin(pluginId);
      res.json({ success: true });
    }
  );
});

router.get('/plugins/available', (req, res) => {
  res.json(pluginManager.getAvailablePlugins());
});

router.post('/plugins/:id/add', (req, res) => {
  const pluginId = req.params.id;
  
  db.db.run(
    'INSERT OR IGNORE INTO plugin_configs (plugin_id, config_json) VALUES (?, ?)',
    [pluginId, '{}'],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // Instantiates the newly approved plugin
      await pluginManager.reloadPlugin(pluginId);
      res.json({ success: true });
    }
  );
});

router.delete('/plugins/:id', (req, res) => {
  const pluginId = req.params.id;
  
  db.db.run(
    'DELETE FROM plugin_configs WHERE plugin_id = ?',
    [pluginId],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const plugin = pluginManager.plugins.get(pluginId);
      if (plugin) {
        if (plugin.hooks && typeof plugin.hooks.onUnload === 'function') {
          try { plugin.hooks.onUnload(); } catch(e) {}
        }
        pluginManager.plugins.delete(pluginId);
        for (const key of Array.from(pluginManager.actions.keys())) {
           if (key.startsWith(`${pluginId}:`)) pluginManager.actions.delete(key);
        }
      }
      res.json({ success: true });
    }
  );
});

router.post('/execute', (req, res) => {
  const { pluginId, actionId, payload } = req.body;
  if (!pluginId || !actionId) {
    return res.status(400).json({ error: 'Missing pluginId or actionId' });
  }

  const success = pluginManager.executeAction(pluginId, actionId, payload);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Action not found or execution failed' });
  }
});

router.post('/buttons', (req, res) => {
  const { id, page_id, row_index, col_index, text, color, icon, actions } = req.body;
  
  if (id) {
    // Update existing button
    db.db.run(
      'UPDATE buttons SET text = ?, color = ?, icon = ? WHERE id = ?',
      [text, color, icon, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Replace all actions
        db.db.run('DELETE FROM actions WHERE button_id = ?', [id], function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          
          if (actions && Array.isArray(actions) && actions.length > 0) {
            const stmt = db.db.prepare('INSERT INTO actions (button_id, plugin_id, action_id, payload) VALUES (?, ?, ?, ?)');
            actions.forEach(a => stmt.run(id, a.plugin_id, a.action_id, JSON.stringify(a.payload || {})));
            stmt.finalize();
          }
          res.json({ success: true, id });
        });
      }
    );
  } else {
    // Create new button
    db.db.run(
      'INSERT INTO buttons (page_id, row_index, col_index, text, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
      [page_id, row_index, col_index, text, color, icon],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const newId = this.lastID;
        
        if (actions && Array.isArray(actions) && actions.length > 0) {
          const stmt = db.db.prepare('INSERT INTO actions (button_id, plugin_id, action_id, payload) VALUES (?, ?, ?, ?)');
          actions.forEach(a => stmt.run(newId, a.plugin_id, a.action_id, JSON.stringify(a.payload || {})));
          stmt.finalize();
        }
        res.json({ success: true, id: newId });
      }
    );
  }
});

router.delete('/buttons/:id', (req, res) => {
  const buttonId = req.params.id;
  db.db.run('DELETE FROM actions WHERE button_id = ?', [buttonId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.db.run('DELETE FROM buttons WHERE id = ?', [buttonId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

router.post('/buttons/:id/execute', (req, res) => {
  const buttonId = req.params.id;
  db.db.all('SELECT * FROM actions WHERE button_id = ? ORDER BY id ASC', [buttonId], (err, actionsRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!actionsRow || actionsRow.length === 0) return res.json({ success: true, message: 'No actions assigned' });
    
    let allSuccess = true;
    for (const action of actionsRow) {
      let parsedPayload = {};
      try { parsedPayload = JSON.parse(action.payload || '{}'); } catch(e){}
      
      const success = pluginManager.executeAction(action.plugin_id, action.action_id, { buttonId: buttonId, payload: parsedPayload });
      if (!success) allSuccess = false;
    }
    
    res.json({ success: allSuccess });
  });
});

router.get('/export', (req, res) => {
  const exportData = {};
  const tables = ['pages', 'buttons', 'actions', 'plugin_configs'];
  let tablesProcessed = 0;
  
  tables.forEach(table => {
    db.db.all(`SELECT * FROM ${table}`, (err, rows) => {
      if (err) {
        console.error(`Export error for ${table}:`, err);
        exportData[table] = [];
      } else {
        exportData[table] = rows;
      }
      
      tablesProcessed++;
      if (tablesProcessed === tables.length) {
        res.json(exportData);
      }
    });
  });
});

router.post('/import', (req, res) => {
  const { pages, buttons, actions, plugin_configs } = req.body;
  if (!pages || !buttons || !actions || !plugin_configs) {
    return res.status(400).json({ error: 'Invalid import file format.' });
  }

  db.db.serialize(() => {
    db.db.run('BEGIN TRANSACTION');
    
    // Clear existing data
    db.db.run('DELETE FROM actions');
    db.db.run('DELETE FROM buttons');
    db.db.run('DELETE FROM pages');
    db.db.run('DELETE FROM plugin_configs');

    // Insert pages
    const insertPage = db.db.prepare('INSERT INTO pages (id, name, type, grid_rows, grid_cols) VALUES (?, ?, ?, ?, ?)');
    pages.forEach(p => insertPage.run(p.id, p.name, p.type || 'grid', p.grid_rows || 3, p.grid_cols || 5));
    insertPage.finalize();

    // Insert buttons
    const insertButton = db.db.prepare('INSERT INTO buttons (id, page_id, row_index, col_index, text, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)');
    buttons.forEach(b => insertButton.run(b.id, b.page_id, b.row_index, b.col_index, b.text, b.color, b.icon));
    insertButton.finalize();

    // Insert actions
    const insertAction = db.db.prepare('INSERT INTO actions (id, button_id, plugin_id, action_id, payload) VALUES (?, ?, ?, ?, ?)');
    actions.forEach(a => insertAction.run(a.id, a.button_id, a.plugin_id, a.action_id, a.payload));
    insertAction.finalize();

    // Insert plugin configs
    const insertConfig = db.db.prepare('INSERT INTO plugin_configs (plugin_id, config_json) VALUES (?, ?)');
    plugin_configs.forEach(pc => insertConfig.run(pc.plugin_id, pc.config_json));
    insertConfig.finalize();

    db.db.run('COMMIT', (err) => {
      if (err) {
        console.error('Import commit error:', err);
        db.db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to import data.' });
      }
      
      // Reload plugins to apply new configs
      const fs = require('fs');
      const path = require('path');
      const folders = fs.readdirSync(pluginManager.driversPath, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);
      
      folders.forEach(folder => {
        try {
          const temp = require(path.join(pluginManager.driversPath, folder, 'index.js'));
          if (temp.id) pluginManager.reloadPlugin(temp.id);
        } catch(e) { }
      });
      
      // Broadcast to UI to reload
      const wsHandler = require('../core/websocketHandler');
      wsHandler.broadcast({ type: 'FORCE_RELOAD' });
      
      res.json({ success: true });
    });
  });
});

module.exports = router;
