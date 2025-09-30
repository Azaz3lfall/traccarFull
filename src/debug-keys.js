import React from "react";

if (process.env.NODE_ENV === "development") {
  const originalCreateElement = React.createElement;
  const originalMap = Array.prototype.map;
  let mapCallCount = 0;

  // Override Array.prototype.map to log all map operations
  Array.prototype.map = function(callback, thisArg) {
    const result = originalMap.call(this, callback, thisArg);
    
    // Prevent infinite recursion
    if (mapCallCount > 0) {
      mapCallCount--;
      return result;
    }
    
    mapCallCount++;
    
    // Get stack trace to find origin
    const stack = new Error().stack;
    const caller = stack.split('\n')[2] || 'unknown';
    
    // Simple key extraction without using map
    const keys = [];
    const duplicateKeys = [];
    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      if (item && item.key !== undefined) {
        if (keys.includes(item.key)) {
          duplicateKeys.push(item.key);
        } else {
          keys.push(item.key);
        }
      }
    }
    
    console.log("🗺️ MAP OPERATION:", {
      arrayLength: this.length,
      resultLength: result.length,
      caller: caller.trim(),
      firstFewItems: this.slice(0, 3),
      hasKeys: keys.length > 0,
      keys: keys,
      duplicateKeys: duplicateKeys
    });
    
    mapCallCount--;
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
