import React from "react";

if (process.env.NODE_ENV === "development") {
  try {
    const originalCreateElement = React.createElement;
    
    // NOTE: We removed the Array.prototype.map override because it causes issues
    // with CSS-in-JS libraries like Emotion/stylis. We'll only override
    // React.createElement to catch empty keys, which is safer and doesn't
    // interfere with internal library operations.
    // Added try-catch to ensure we never break the app if something goes wrong.

    React.createElement = (type, props, ...children) => {
      try {
        // Only check for empty keys if props exists and is an object
        if (props && typeof props === 'object' && props.key !== undefined) {
          if (props.key === null || props.key === "") {
            console.warn("⚠️ Empty key detected:", { type, props });
          }
        }
        return originalCreateElement(type, props, ...children);
      } catch (error) {
        // If anything goes wrong, fall back to original createElement
        console.error("Error in React.createElement override:", error);
        return originalCreateElement(type, props, ...children);
      }
    };
  } catch (error) {
    // If we can't override React.createElement, just continue without it
    console.warn("Could not set up debug-keys:", error);
  }
}
