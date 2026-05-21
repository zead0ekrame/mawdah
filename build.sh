#!/bin/bash
# build.sh

echo "Starting custom build wrapper..." > build.log 2>&1

# Run the actual build commands and append output to build.log
(npm install && npx prisma generate && npm run build) >> build.log 2>&1
STATUS=$?

echo "Build finished with status $STATUS" >> build.log 2>&1

if [ $STATUS -ne 0 ]; then
  echo "Build failed! Pushing logs to GitHub..."
  # Configure git
  git config user.email "zeadekrame@gmail.com"
  git config user.name "zead0ekrame"
  
  # Check out a logs branch or create it
  git checkout -b build-logs || git checkout build-logs
  
  # Add and commit build.log
  git add build.log
  git commit -m "Build failure logs for status $STATUS"
  
  # Push to origin
  git push -f https://zead0ekrame:${GITHUB_PAT}@github.com/zead0ekrame/mawdah.git build-logs
fi

# Exit with the build status so Render knows if it failed
exit $STATUS
