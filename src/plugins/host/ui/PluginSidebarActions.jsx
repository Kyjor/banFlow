import React, { useEffect, useState } from 'react';
import { RobotOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import {
  getPanels,
  getSidebarActions,
  isPanelOpen,
  setPanelOpen,
  subscribeUiRegistry,
} from './pluginUiRegistry';

export default function PluginSidebarActions() {
  const [, tick] = useState(0);

  useEffect(() => subscribeUiRegistry(() => tick((n) => n + 1)), []);

  const actions = getSidebarActions();
  const panels = getPanels();

  const items =
    actions.length > 0
      ? actions.map((a) => ({ type: 'action', ...a }))
      : panels
          .filter((p) => p.id === 'ai-assistant-panel')
          .map((p) => ({
            type: 'panel',
            id: p.id,
            label: 'AI Assistant',
            icon: RobotOutlined,
            onClick: () => setPanelOpen(p.id, !isPanelOpen(p.id)),
          }));

  if (!items.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Tooltip key={item.id} title={item.label} placement="left">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={Icon ? <Icon /> : undefined}
              onClick={item.onClick}
              aria-label={item.label}
            >
              {!Icon ? 'AI' : null}
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
}
