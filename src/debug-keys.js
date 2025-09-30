import React from "react";

if (process.env.NODE_ENV === "development") {
  const originalCreateElement = React.createElement;
  const originalMap = Array.prototype.map;

  // Override Array.prototype.map to log all map operations
  Array.prototype.map = function(callback, thisArg) {
    const result = originalMap.call(this, callback, thisArg);
    
    // Get stack trace to find origin
    const stack = new Error().stack;
    const caller = stack.split('\n')[2] || 'unknown';
    
    console.log("🗺️ MAP OPERATION:", {
      arrayLength: this.length,
      resultLength: result.length,
      caller: caller.trim(),
      firstFewItems: this.slice(0, 3),
      hasKeys: result.some(item => item && item.key !== undefined),
      keys: result.filter(item => item && item.key !== undefined).map(item => item.key),
      duplicateKeys: result.filter(item => item && item.key !== undefined).map(item => item.key).filter((key, index, arr) => arr.indexOf(key) !== index)
    });
    
    return result;
  };

  React.createElement = (type, props, ...children) => {
    if (props && props.key !== undefined) {
      if (props.key === null || props.key === "") {
        console.warn("⚠️ Empty key detected:", { type, props });
      }
      
      // Log all keys being created
      console.log("🔑 KEY CREATED:", {
        type: type,
        key: props.key,
        props: Object.keys(props).slice(0, 5) // First 5 prop names
      });
    }
    return originalCreateElement(type, props, ...children);
  };
}
