#!/bin/bash

if [ ! -f "kazmight.js" ]; then
    echo "Error: kazmight.js not found in the current directory."
    exit 1
fi

if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed. Please install it to run the bot."
    exit 1
fi

echo "Starting the Pharos Bot..."
node kazmight.js

echo "Bot script has finished or was stopped."
