import { Plugins, Plugin, PluginRegistry } from './types.js';

/**
 * Wraps plugins collection with utility methods
 */
export const pluginRegistry = (plugins: Plugins): PluginRegistry => {
  return {
    plugins: plugins,
    entries: (): [string, Plugin][] => Object.entries(plugins),
    values: (): Plugin[] => Object.values(plugins),
    exists: (): boolean => Object.values(plugins).length > 0,
    findWithLabelByType(type: string): [string, Plugin | undefined] {
      for (const [label, plugin] of Object.entries(this.plugins) as [string, Plugin][]) {
        if (!plugin || typeof plugin !== 'object') continue;
        if (!plugin.propPanel || typeof plugin.propPanel !== 'object') continue;

        const defaultSchema = plugin.propPanel.defaultSchema as Record<string, unknown>;

        if (defaultSchema && 'type' in defaultSchema && defaultSchema.type === type) {
          return [label, plugin];
        }
      }
      return ['', undefined];
    },
    findByType(type: string): Plugin | undefined {
      const [, plugin] = this.findWithLabelByType(type);
      return plugin;
    },
  };
};
