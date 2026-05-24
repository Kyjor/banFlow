import React, { useEffect, useState } from 'react';
import { Drawer } from 'antd';
import {
  getPanels,
  isPanelOpen,
  setPanelOpen,
  subscribePanelOpen,
  subscribeUiRegistry,
} from './pluginUiRegistry';

export default function PluginPanelHost() {
  const [, tick] = useState(0);
  const [, tickOpen] = useState(0);

  useEffect(() => subscribeUiRegistry(() => tick((n) => n + 1)), []);
  useEffect(() => subscribePanelOpen(() => tickOpen((n) => n + 1)), []);

  const panels = getPanels();

  return (
    <>
      {panels.map((panel) => {
        const PanelComponent = panel.component;
        const open = isPanelOpen(panel.id);
        return (
          <Drawer
            key={panel.id}
            title={panel.id}
            placement="right"
            width={420}
            open={open}
            onClose={() => setPanelOpen(panel.id, false)}
            mask={false}
            getContainer={false}
            style={{ position: 'fixed' }}
            bodyStyle={{
              overflow: 'hidden',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {open ? (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <PanelComponent />
              </div>
            ) : null}
          </Drawer>
        );
      })}
    </>
  );
}
