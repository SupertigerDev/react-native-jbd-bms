export class Queue {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing: boolean = false;

  /**
   * Enqueues a function that returns a Promise.
   * @param task The asynchronous function to add to the queue.
   * @returns A Promise that resolves when the task is complete.
   */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result; // For chaining if needed
        } catch (error) {
          reject(error);
          throw error; // Re-throw for proper error handling outside
        }
      });
      this.processQueue(); // Start/continue processing
    });
  }

  /**
   * Processes the queue.  Called internally when a task is added.
   * Handles concurrency limits if needed by checking isProcessing
   */
  private async processQueue() {
    if (this.isProcessing) {
      return; // Already processing, let it continue
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        // Should always be true, but good practice
        try {
          await task(); // Await the task's promise
        } catch (error) {
          // Important: Handle or log errors here.  They've already been rejected
          // in enqueue, but this prevents unhandled rejections.
          console.error('Error in queue task:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Clears the queue. Useful if you need to reset or cancel pending tasks.
   */
  clear() {
    this.queue = [];
    this.isProcessing = false; // Reset processing state if needed
  }

  /**
   * Returns the current length of the queue.
   */
  get length(): number {
    return this.queue.length;
  }
}
