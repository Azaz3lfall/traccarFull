import React from "react";

if (process.env.NODE_ENV === "development") {
  const originalCreateElement = React.createElement;

  React.createElement = (type, props, ...children) => {
    if (props && props.key !== undefined) {
      if (props.key === null || props.key === "") {
        console.warn("⚠️ Empty key detected:", { type, props });
      }
    }
    return originalCreateElement(type, props, ...children);
  };
}
