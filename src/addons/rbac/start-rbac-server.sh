#!/bin/bash
# Small script to start the RBAC server using nodemon for development
# This mimics the reseller server startup script

# Find the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd "$SCRIPT_DIR"

# Run with nodemon if available, otherwise just node
if command -v nodemon &> /dev/null
then
    nodemon rbacServer.mjs
else
    node rbacServer.mjs
fi
