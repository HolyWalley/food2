/**
 * Utilities for working with the View Transitions API
 */

// Import the CSS for transitions
import './viewTransition.css';

// Interface for the document with View Transitions API
interface DocumentWithViewTransition extends Document {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    ready: Promise<void>;
    finished: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
}

/**
 * Check if the browser supports the View Transitions API
 */
export const supportsViewTransitions = (): boolean => {
  return 'startViewTransition' in document;
};

/**
 * Navigation directions for transition effects
 */
type NavigationDirection = 'food-to-details' | 'details-to-food' | 'neutral';

/**
 * Wraps navigation functions with View Transitions API if supported.
 * Falls back to regular navigation if not supported.
 * 
 * @param navigateFunction - The function that performs the actual navigation
 * @param direction - Optional direction of navigation for customizing transitions
 * @returns Promise that resolves when the transition is complete
 */
export const withViewTransition = async (
  navigateFunction: () => void, 
  direction: NavigationDirection = 'neutral'
): Promise<void> => {
  if (supportsViewTransitions()) {
    // Disable scrolling during transition
    document.body.classList.add('disable-scroll');
    
    // Set the transition direction as a data attribute on the HTML element
    // This allows us to customize animations based on direction
    if (direction !== 'neutral') {
      document.documentElement.setAttribute('data-direction', direction);
    }
    
    try {
      // Use View Transitions API
      const doc = document as DocumentWithViewTransition;
      const transition = doc.startViewTransition?.(() => {
        // Run the navigation function
        navigateFunction();
        return new Promise<void>((resolve) => {
          // Give the navigation a moment to complete
          setTimeout(resolve, 0);
        });
      });
      
      // Wait for the transition to finish
      await transition?.finished;
    } catch (error) {
      console.error('Error during view transition:', error);
      // Fallback to regular navigation if there's an error
      navigateFunction();
    } finally {
      // Re-enable scrolling
      document.body.classList.remove('disable-scroll');
      
      // Clear the direction attribute after transition
      if (direction !== 'neutral') {
        document.documentElement.removeAttribute('data-direction');
      }
    }
  } else {
    // Fallback to regular navigation if View Transitions API is not supported
    navigateFunction();
  }
};