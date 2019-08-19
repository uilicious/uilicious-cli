#!/bin/bash

# Get current directory, and normalize it
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Does publication
npm publish --access public