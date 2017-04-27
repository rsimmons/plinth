export default function createEventOutput() {
  const subscribers = [];
  const subscribe = (cb) => {
    subscribers.push(cb);
    return () => {
      subscribers.splice(subscribers.indexOf(cb), 1);
    };
  };
  const emit = (time, value) => {
    for (const subscriber of subscribers) {
      subscriber(time, value);
    }
  };
  return [subscribe, emit];
}
