import { pluginRegistry } from '../src/pluginRegistry.js';
import { Plugins } from '../src/types.js';

describe('pluginRegistry', () => {
  it('returns all entries as [label, plugin] pairs', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
      pluginB: { propPanel: { defaultSchema: { type: 'typeB' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.entries()).toEqual([
      ['pluginA', plugins.pluginA],
      ['pluginB', plugins.pluginB],
    ]);
  });

  it('returns all plugin values', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
      pluginB: { propPanel: { defaultSchema: { type: 'typeB' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.values()).toEqual([plugins.pluginA, plugins.pluginB]);
  });

  it('checks if plugins exist', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.exists()).toBe(true);
  });

  it('returns false if no plugins exist', () => {
    const plugins: Plugins = {};
    const registry = pluginRegistry(plugins);

    expect(registry.exists()).toBe(false);
  });

  it('finds a plugin with label by type', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
      pluginB: { propPanel: { defaultSchema: { type: 'typeB' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.findWithLabelByType('typeA')).toEqual(['pluginA', plugins.pluginA]);
  });

  it('returns undefined if no plugin matches the type in findWithLabelByType', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.findWithLabelByType('typeB')).toEqual(['', undefined]);
  });

  it('finds a plugin by type', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
      pluginB: { propPanel: { defaultSchema: { type: 'typeB' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.findByType('typeA')).toEqual(plugins.pluginA);
  });

  it('returns undefined if no plugin matches the type in findByType', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.findByType('typeB')).toBeUndefined();
  });

  it('ignores plugins without a valid propPanel in findWithLabelByType', () => {
    const plugins = {
      pluginA: { propPanel: { defaultSchema: { type: 'typeA' } } },
      pluginB: { propPanel: null },
    };
    // @ts-ignore
    const registry = pluginRegistry(plugins);

    expect(registry.findWithLabelByType('typeB')).toEqual(['', undefined]);
  });
});