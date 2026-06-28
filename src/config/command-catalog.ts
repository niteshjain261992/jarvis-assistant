export type CommandExecutor = 'client' | 'server';

export interface CommandCatalogEntry {
  command: string;
  phrases: readonly string[];
  executor: CommandExecutor;
  payload: Record<string, unknown>;
}

export const COMMAND_CATALOG: readonly CommandCatalogEntry[] = [
  {
    command: 'OPEN:CAMERA',
    phrases: [
      'open camera',
      'show camera',
      'turn on camera',
      'start camera',
      'take a photo',
      'take a picture',
    ],
    executor: 'client',
    payload: { target: 'camera' },
  },
  {
    command: 'OFF:LIGHTS',
    phrases: ['turn off lights', 'lights off', 'switch off lights', 'kill the lights'],
    executor: 'client',
    payload: { target: 'lights', state: 'off' },
  },
  {
    command: 'PLAY:MUSIC',
    phrases: ['play music', 'start music', 'play some songs', 'put on music'],
    executor: 'server',
    payload: { action: 'music' },
  },
];

export const ALLOWED_COMMANDS: ReadonlySet<string> = new Set(
  COMMAND_CATALOG.map((entry) => entry.command),
);

export function getCommandCatalogEntry(command: string): CommandCatalogEntry | undefined {
  return COMMAND_CATALOG.find((entry) => entry.command === command);
}
