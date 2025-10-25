/**
 * @fileoverview Try-Catch Wrapper Utility
 * Higher-order function to wrap async controllers with error handling.
 * @module utils/tryCatch
 */

/**
 * Wraps async controller functions with try-catch for error handling
 * Automatically passes errors to Express error middleware
 * @param {Function} controller - Async controller function
 * @returns {Function} Wrapped controller with error handling
 * @example
 * export const MyController = tryCatch(async (req, res) => {
 *   // Your controller logic
 * });
 */
export function tryCatch(controller) {
  return async (req, res, next) => {
    try {
      await controller(req, res);
    } catch (error) {
      return next(error);
    }
  };
}
