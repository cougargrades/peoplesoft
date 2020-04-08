#!/bin/sh

# https://stackoverflow.com/a/2871034
set -e

if [ -n "${PEOPLESOFT_SKIP_POSTINSTALLSH}" ]]; then
  return 0;
fi

if [ -n "${CHROME_DEVEL_SANDBOX}" ]; then
  echo "CHROME_DEVEL_SANDBOX is already set.";
  return 0;
fi

# reference: https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#alternative-setup-setuid-sandbox

echo "\e[95mpostinstall.sh will request sudo permissions, to see why go to:"
echo "https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#alternative-setup-setuid-sandbox"
echo ""
echo "alternatively, you could skip the post install script"
echo "\e[0m"

# cd to the downloaded instance
cd ./node_modules/puppeteer/.local-chromium/linux-*/chrome-linux/
sudo chown root:root chrome_sandbox
sudo chmod 4755 chrome_sandbox
# copy sandbox executable to a shared location
sudo cp -p chrome_sandbox /usr/local/sbin/chrome-devel-sandbox
# export CHROME_DEVEL_SANDBOX env variable

echo "\e[95mpostinstall.sh complete."
echo "You might want to export this by default:"
echo "\e[96m"
echo "export CHROME_DEVEL_SANDBOX=/usr/local/sbin/chrome-devel-sandbox"
echo "\e[0m"