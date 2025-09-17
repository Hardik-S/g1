import StockfishService from '../StockfishService';

describe('StockfishService', () => {
  test('enforces one-second delay for engine responses', async () => {
    jest.useFakeTimers();
    let fakeNow = 0;
    const nowProvider = () => fakeNow;
    const fakeWorker = { postMessage: jest.fn(), terminate: jest.fn() };
    const service = new StockfishService({
      createWorker: () => fakeWorker,
      nowProvider
    });

    service.ready = Promise.resolve();
    service.setSkillLevel = jest.fn().mockResolvedValue(undefined);
    service.waitUntilReady = jest.fn().mockResolvedValue(undefined);

    let resolved = false;
    const movePromise = service.requestMove('startpos', { skillLevel: 7 }).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(fakeWorker.postMessage).toHaveBeenCalledWith('position startpos');
    const readyPromise = service.waitUntilReady.mock.results[0]?.value || Promise.resolve();
    await readyPromise;
    expect(fakeWorker.postMessage).toHaveBeenCalledWith('go movetime 500');

    const resolver = service.bestMoveResolver;
    expect(typeof resolver).toBe('function');

    jest.runOnlyPendingTimers();
    await Promise.resolve();
    expect(resolved).toBe(false);

    service.resolveBestMove('e7e5');

    jest.advanceTimersByTime(999);
    fakeNow += 999;
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1);
    fakeNow += 1;
    jest.runOnlyPendingTimers();
    await movePromise;
    expect(resolved).toBe(true);

    jest.useRealTimers();
  });
});
