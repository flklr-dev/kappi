#!/bin/bash

# This script automates EAS iOS builds for development and production profiles.
# It should be run from the client/ directory.

# Function to display usage information
usage() {
  echo "Usage: $0 [development|production]"
  echo "Builds the iOS app using EAS with the specified profile."
  echo "  development: Builds a development client for internal testing."
  echo "  production: Builds an IPA for App Store submission."
  exit 1
}

# Check if an argument is provided
if [ -z "$1" ]; then
  usage
fi

PROFILE=$1

# Validate the profile argument
if [[ "$PROFILE" != "development" && "$PROFILE" != "production" ]]; then
  echo "Error: Invalid profile. Must be 'development' or 'production'."
  usage
fi

echo "Starting EAS iOS build with profile: $PROFILE"

# Run the EAS build command
npx eas build -p ios --profile "$PROFILE" --non-interactive

if [ $? -eq 0 ]; then
  echo "EAS iOS build for profile '$PROFILE' completed successfully."
else
  echo "EAS iOS build for profile '$PROFILE' failed."
  exit 1
fi
