const hostname = window.location.hostname || 'localhost';
const API_URL = `http://${hostname}:3001/api`;

export const fetchPages = async () => {
  const res = await fetch(`${API_URL}/pages`);
  return res.json();
};

export const fetchButtons = async (pageId) => {
  const res = await fetch(`${API_URL}/pages/${pageId}/buttons`);
  return res.json();
};

export const updatePage = async (pageId, data) => {
  const res = await fetch(`${API_URL}/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const createPage = async (data) => {
  const res = await fetch(`${API_URL}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deletePage = async (pageId) => {
  const res = await fetch(`${API_URL}/pages/${pageId}`, {
    method: 'DELETE'
  });
  return res.json();
};

export const fetchActions = async () => {
  const res = await fetch(`${API_URL}/actions`);
  return res.json();
};

export const executeAction = async (pluginId, actionId, payload) => {
  const res = await fetch(`${API_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pluginId, actionId, payload })
  });
  return res.json();
};

export const saveButton = async (buttonData) => {
  const res = await fetch(`${API_URL}/buttons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buttonData)
  });
  return res.json();
};

export const executeButtonAction = async (buttonId) => {
  const res = await fetch(`${API_URL}/buttons/${buttonId}/execute`, {
    method: 'POST'
  });
  return res.json();
};

export const deleteButton = async (buttonId) => {
  const res = await fetch(`${API_URL}/buttons/${buttonId}`, {
    method: 'DELETE'
  });
  return res.json();
};

export const fetchPlugins = async () => {
  const res = await fetch(`${API_URL}/plugins`);
  return res.json();
};

export const fetchAvailablePlugins = async () => {
  const res = await fetch(`${API_URL}/plugins/available`);
  return res.json();
};

export const addPlugin = async (pluginId) => {
  const res = await fetch(`${API_URL}/plugins/${pluginId}/add`, { method: 'POST' });
  return res.json();
};

export const removePlugin = async (pluginId) => {
  const res = await fetch(`${API_URL}/plugins/${pluginId}`, { method: 'DELETE' });
  return res.json();
};

export const savePluginConfig = async (pluginId, config) => {
  const res = await fetch(`${API_URL}/plugins/${pluginId}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return res.json();
};

export const fetchVariables = async () => {
  const res = await fetch(`${API_URL}/variables`);
  return res.json();
};
