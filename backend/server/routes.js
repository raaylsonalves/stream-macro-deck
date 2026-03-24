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

router.get('/variables', (req, res) => {
  res.json(pluginManager.getVariables());
});

router.get('/pages/:id/buttons', (req, res) => {
  const pageId = req.params.id;
  db.db.all(`
    SELECT b.*, a.plugin_id, a.action_id 
    FROM buttons b 
    LEFT JOIN actions a ON b.id = a.button_id 
    WHERE b.page_id = ?
  `, [pageId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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
  const { id, page_id, row_index, col_index, text, color, icon, action_id, plugin_id } = req.body;
  
  if (id) {
    // Update existing button
    db.db.run(
      'UPDATE buttons SET text = ?, color = ?, icon = ? WHERE id = ?',
      [text, color, icon, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Upsert action
        if (action_id && plugin_id) {
          db.db.run(
            'UPDATE actions SET plugin_id = ?, action_id = ? WHERE button_id = ?',
            [plugin_id, action_id, id],
            function (updateErr) {
              if (this.changes === 0) {
                db.db.run('INSERT INTO actions (button_id, plugin_id, action_id) VALUES (?, ?, ?)', [id, plugin_id, action_id]);
              }
            }
          );
        }
        res.json({ success: true, id });
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
        
        if (action_id && plugin_id) {
          db.db.run('INSERT INTO actions (button_id, plugin_id, action_id) VALUES (?, ?, ?)', [newId, plugin_id, action_id]);
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
  db.db.get('SELECT * FROM actions WHERE button_id = ?', [buttonId], (err, action) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!action) return res.status(404).json({ error: 'No action assigned to this button' });
    
    const success = pluginManager.executeAction(action.plugin_id, action.action_id, { buttonId: buttonId, payload: action.payload });
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Action execution failed - check logs' });
    }
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
    const insertPage = db.db.prepare('INSERT INTO pages (id, name, grid_rows, grid_cols) VALUES (?, ?, ?, ?)');
    pages.forEach(p => insertPage.run(p.id, p.name, p.grid_rows || 3, p.grid_cols || 5));
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
