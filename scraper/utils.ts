export class Utils {
  /**
   * Sleep for the specified number of milliseconds
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after the specified time
   */
  static async Sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}