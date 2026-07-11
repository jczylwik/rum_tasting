#!/bin/bash
set -euo pipefail

# Use the documented entrypoint for local and Azure App Service startup.
python app.py
