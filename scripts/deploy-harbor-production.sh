#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Print each command to stdout before executing it.
set -x

# Ensure the script is run from the root of the workspace
if [ ! -f ./pnpm-workspace.yaml ]; then
  echo "Error: This script must be run from the root of the workspace"
  exit 1
fi

DEPLOY_EHR_APP="${DEPLOY_EHR_APP:-true}"
DEPLOY_EHR_ZAMBDA="${DEPLOY_EHR_ZAMBDA:-true}"
DEPLOY_CARE_INTAKE_APP="${DEPLOY_CARE_INTAKE_APP:-true}"
DEPLOY_CARE_INTAKE_ZAMBDA="${DEPLOY_CARE_INTAKE_ZAMBDA:-true}"

# Print versions for diagnostics
echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"

# Install dependencies
echo "Installing dependencies..."
pnpm install --no-frozen-lockfile


# Build the telemed-ehr/app
if [ "$DEPLOY_EHR_APP" = "true" ]; then
echo "Building package: packages/telemed-ehr/app"
pushd "packages/telemed-ehr/app"
pnpm ci-deploy:production
popd
fi

# Build the telemed-ehr/zambdas
if [ "$DEPLOY_EHR_ZAMBDA" = "true" ]; then
echo "Building package: packages/telemed-ehr/zambdas"
pushd "packages/telemed-ehr/zambdas"
yes | pnpm deploy-zambdas development
popd
fi

# Build the telemed-intake/app
if [ "$DEPLOY_CARE_INTAKE_APP" = "true" ]; then
echo "Building package: telemed-intake/app"
pushd "packages/telemed-intake/app"
pnpm ci-deploy:production
popd
fi

# Build the telemed-intage/zambdas
if [ "$DEPLOY_CARE_INTAKE_ZAMBDA" = "true" ]; then
echo "Building package: telemed-intake/zambdas"
pushd "packages/telemed-intake/zambdas"
yes | pnpm deploy-zambdas dev
popd
fi

echo "Deploy script finished successfully."
