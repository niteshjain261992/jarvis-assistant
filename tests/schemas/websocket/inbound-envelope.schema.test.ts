import { inboundEnvelopeSchema } from '@/schemas/websocket/inbound-envelope.schema.js';

const VALID_TIMESTAMP = 1_719_311_000;

function userPromptFrame(overrides: Record<string, unknown> = {}) {
  return {
    type: 'USER_PROMPT',
    message_id: 'msg-1a2b3c',
    timestamp: VALID_TIMESTAMP,
    payload: {
      text: 'Turn on the living room lights.',
      input_method: 'voice',
    },
    ...overrides,
  };
}

function actionAckFrame(overrides: Record<string, unknown> = {}) {
  return {
    type: 'ACTION_ACK',
    message_id: 'ack-4d5e6f',
    timestamp: VALID_TIMESTAMP,
    payload: {
      original_server_message_id: 'srv-9z8y7x',
      action_executed: 'PLAY_MUSIC',
      status: 'SUCCESS',
      error_details: null,
    },
    ...overrides,
  };
}

function locationUpdateFrame(overrides: Record<string, unknown> = {}) {
  return {
    type: 'LOCATION_UPDATE',
    message_id: 'loc-7g8h9i',
    timestamp: VALID_TIMESTAMP,
    payload: {
      latitude: 28.4595,
      longitude: 77.0266,
      accuracy_meters: 12.5,
      speed_kmh: 0.0,
    },
    ...overrides,
  };
}

describe('inboundEnvelopeSchema', () => {
  it('accepts a valid USER_PROMPT envelope', () => {
    const result = inboundEnvelopeSchema.safeParse(userPromptFrame());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('USER_PROMPT');
    }
  });

  it('accepts a valid ACTION_ACK envelope', () => {
    const result = inboundEnvelopeSchema.safeParse(actionAckFrame());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('ACTION_ACK');
    }
  });

  it('accepts ACTION_ACK with FAILURE and error_details', () => {
    const result = inboundEnvelopeSchema.safeParse(
      actionAckFrame({
        payload: {
          original_server_message_id: 'srv-9z8y7x',
          action_executed: 'PLAY_MUSIC',
          status: 'FAILURE',
          error_details: 'Playback failed',
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts a valid LOCATION_UPDATE envelope', () => {
    const result = inboundEnvelopeSchema.safeParse(locationUpdateFrame());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('LOCATION_UPDATE');
    }
  });

  it('rejects LOCATION_UPDATE with latitude out of range', () => {
    const result = inboundEnvelopeSchema.safeParse(
      locationUpdateFrame({
        payload: {
          latitude: 91,
          longitude: 77.0266,
          accuracy_meters: 12.5,
          speed_kmh: 0.0,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'payload.latitude')).toBe(
        true,
      );
    }
  });

  it('rejects missing message_id', () => {
    const result = inboundEnvelopeSchema.safeParse(userPromptFrame({ message_id: undefined }));
    expect(result.success).toBe(false);
  });

  it('rejects empty payload.text', () => {
    const result = inboundEnvelopeSchema.safeParse(
      userPromptFrame({
        payload: {
          text: '   ',
          input_method: 'chat',
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'payload.text')).toBe(
        true,
      );
    }
  });

  it('rejects invalid input_method', () => {
    const result = inboundEnvelopeSchema.safeParse(
      userPromptFrame({
        payload: {
          text: 'hello',
          input_method: 'sms',
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects unknown type', () => {
    const result = inboundEnvelopeSchema.safeParse(
      userPromptFrame({
        type: 'UNKNOWN_TYPE',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects ACTION_ACK FAILURE without error_details', () => {
    const result = inboundEnvelopeSchema.safeParse(
      actionAckFrame({
        payload: {
          original_server_message_id: 'srv-9z8y7x',
          action_executed: 'PLAY_MUSIC',
          status: 'FAILURE',
          error_details: null,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects ACTION_ACK SUCCESS with error_details', () => {
    const result = inboundEnvelopeSchema.safeParse(
      actionAckFrame({
        payload: {
          original_server_message_id: 'srv-9z8y7x',
          action_executed: 'PLAY_MUSIC',
          status: 'SUCCESS',
          error_details: 'should be null',
        },
      }),
    );
    expect(result.success).toBe(false);
  });
});
