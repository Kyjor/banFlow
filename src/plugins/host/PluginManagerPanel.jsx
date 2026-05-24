import React from 'react';
import { Card, Switch, Typography } from 'antd';

const PLUGINS = [
  { id: 'ai-assistant', name: 'AI Assistant', description: 'OpenRouter chat and banFlow actions' },
  { id: 'pomoranch', name: 'PomoRanch', description: 'Timer break mini-game' },
];

function loadEnabled() {
  try {
    return JSON.parse(localStorage.getItem('banflowEnabledPlugins') || 'null') || {
      'ai-assistant': true,
      pomoranch: true,
    };
  } catch {
    return { 'ai-assistant': true, pomoranch: true };
  }
}

/** Simple enable list (full marketplace later). */
export default function PluginManagerPanel() {
  const [enabled, setEnabled] = React.useState(loadEnabled);

  const toggle = (id, on) => {
    const next = { ...enabled, [id]: on };
    setEnabled(next);
    localStorage.setItem('banflowEnabledPlugins', JSON.stringify(next));
  };

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={5}>Plugins</Typography.Title>
      <Typography.Paragraph type="secondary">
        Restart the app after changing plugins. Permissions are declared in each plugin manifest.
      </Typography.Paragraph>
      {PLUGINS.map((p) => (
        <Card key={p.id} size="small" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{p.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{p.description}</div>
            </div>
            <Switch checked={!!enabled[p.id]} onChange={(v) => toggle(p.id, v)} />
          </div>
        </Card>
      ))}
    </div>
  );
}
