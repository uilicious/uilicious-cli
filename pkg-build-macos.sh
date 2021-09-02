#!/bin/bash

# Strict mode
set -euo pipefail

# Cleanup the files
mkdir -p ./bin
rm -f ./bin/uilicious-*

#
# Does the builds
#

COMMA=","
TARGET_MACOS="node16-macos-x64,node16-macos-arm64"
TARGET_LINUX="node16-linux-x64,node16-linux-arm64"
TARGET_ALPINE="node16-alpine-x64"
TARGET_WINDOWS="node16-win-x64"
TARGET_ARM="node16-linux-armv7"

TARGET_ALL=$TARGET_MACOS

# The various builds
npx --package "pkg@5.3.1" \
    pkg ./src/uilicious-cli.js \
    --options max_old_space_size=2048 \
    --no-bytecode --public-packages "*" --public \
    --out-path ./bin/ \
    --target $TARGET_ALL 

#
# Lets rename the files
#
mkdir -p ./bin
cd ./bin

# # 64-bit support
# mv  uilicious-*-win-x64.exe  uilicious-cli-win-64bit.exe
# mv  uilicious-*-macos-x64    uilicious-cli-macos-64bit
# mv  uilicious-*-linux-x64    uilicious-cli-linux-64bit
# mv  uilicious-*-alpine-x64   uilicious-cli-alpine-64bit

# # arm support
# mv  uilicious-*-macos-arm64  uilicious-cli-macos-arm64
# mv  uilicious-*-linux-arm64  uilicious-cli-linux-arm64

# # 32-bit support
# mv  uilicious-*-linux-x86    uilicious-cli-linux-32bit
# mv  uilicious-*-macos-x86    uilicious-cli-macos-32bit
# mv  uilicious-*-win-x86.exe  uilicious-cli-win-32bit.exe
