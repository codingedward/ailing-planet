export default function nonBlockingWait(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
