import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RobotOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import pluginHost from '../PluginHost';
import {
  getPanels,
  isPanelOpen,
  notifyUi,
  setPanelOpen,
  subscribeUiRegistry,
} from './pluginUiRegistry';

/** Always-visible AI entry; portaled to body so layout overflow cannot hide it. */
export default function HostAiButton() {
  const [, tick] = useState(0);

  useEffect(() => subscribeUiRegistry(() => tick((n) => n + 1)), []);

  const openAssistant = async () => {
    const panelId = 'ai-assistant-panel';
    let panels = getPanels();

    if (!panels.some((p) => p.id === panelId)) {
      await pluginHost.loadPlugin('ai-assistant');
      notifyUi();
      panels = getPanels();
    }

    if (panels.some((p) => p.id === panelId)) {
      setPanelOpen(panelId, !isPanelOpen(panelId));
    } else {
      console.warn('[HostAiButton] AI Assistant plugin did not register a panel');
    }
  };

  return createPortal(
    <Tooltip title="AI Assistant" placement="left">
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<RobotOutlined />}
        onClick={() => void openAssistant()}
        aria-label="AI Assistant"
        data-testid="host-ai-button"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 24,
          zIndex: 10000,
          width: 56,
          height: 56,
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        }}
      />
    </Tooltip>,
    document.body,
  );
}
