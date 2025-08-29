export const createRequestDeduplicator = <T>(fun: () => Promise<T>) => {
  let waiting: ((value: T | PromiseLike<T>) => void)[] = [];

  const request = async () => {
    return new Promise<T>(async resolve => {
      if (waiting.length) {
        waiting.push(resolve);
        return;
      }
      waiting.push(resolve);
      const result = await fun();
      waiting.forEach(r => r(result));
      waiting = [];
    });
  };

  return {
    request,
  };
};
