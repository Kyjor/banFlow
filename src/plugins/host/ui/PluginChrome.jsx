import React from 'react';
import PluginActionPreviewHost from './PluginActionPreviewHost';
import PluginPanelHost from './PluginPanelHost';

export default function PluginChrome() {
  const pluginsEnabled =
    import.meta.env.VITE_ENABLE_PLUGINS === 'true' || import.meta.env.DEV;

  if (!pluginsEnabled) return null;

  return (
    <>
      <PluginPanelHost />
      <PluginActionPreviewHost />
    </>
  );
}
