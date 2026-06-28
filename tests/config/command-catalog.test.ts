import {
  ALLOWED_COMMANDS,
  COMMAND_CATALOG,
  getCommandCatalogEntry,
} from '@/config/command-catalog.js';

describe('command-catalog', () => {
  it('ALLOWED_COMMANDS contains every catalog command', () => {
    expect(ALLOWED_COMMANDS.size).toBe(COMMAND_CATALOG.length);
    for (const entry of COMMAND_CATALOG) {
      expect(ALLOWED_COMMANDS.has(entry.command)).toBe(true);
    }
  });

  it('getCommandCatalogEntry returns executor and payload metadata', () => {
    expect(getCommandCatalogEntry('OPEN:CAMERA')).toMatchObject({
      executor: 'client',
      payload: { target: 'camera' },
    });
    expect(getCommandCatalogEntry('PLAY:MUSIC')).toMatchObject({
      executor: 'server',
      payload: { action: 'music' },
    });
  });
});
