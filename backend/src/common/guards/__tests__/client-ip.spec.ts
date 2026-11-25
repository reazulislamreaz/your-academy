import { clientIp, isInternalServerRequest } from '../client-ip';

/** RL-2 — which requests skip the throttler (container-to-container only). */
describe('isInternalServerRequest', () => {
  const req = (remoteAddress: string, xff?: string) => ({
    headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
    socket: { remoteAddress },
  });

  it.each(['172.18.0.5', '::ffff:172.21.0.4', '10.0.3.2', '192.168.1.9', 'fd00::12'])(
    'skips a private container peer without X-Forwarded-For (%s)',
    (peer) => expect(isInternalServerRequest(req(peer))).toBe(true),
  );

  it('never skips a request that came through nginx (X-Forwarded-For present)', () => {
    expect(isInternalServerRequest(req('172.18.0.3', '203.0.113.7'))).toBe(false);
  });

  it.each(['203.0.113.7', '::ffff:198.51.100.4', '127.0.0.1', '::1', '172.32.0.1', '172.15.9.9'])(
    'never skips public or loopback peers (%s)',
    (peer) => expect(isInternalServerRequest(req(peer))).toBe(false),
  );
});

describe('clientIp', () => {
  const saved = process.env.TRUSTED_CLIENT_IP_HEADER;
  afterEach(() => {
    process.env.TRUSTED_CLIENT_IP_HEADER = saved;
  });

  it('uses req.ip (Express trust proxy) when no edge header is configured', () => {
    delete process.env.TRUSTED_CLIENT_IP_HEADER;
    expect(clientIp({ headers: { 'cf-connecting-ip': '9.9.9.9' }, ip: '203.0.113.7' })).toBe(
      '203.0.113.7',
    );
  });
});
