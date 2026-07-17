/**
 * macOS-gated helper: prints xcodebuild archive steps.
 * Does not run archive on Windows/Linux.
 */
import { platform } from "node:os";

if (platform() !== "darwin") {
  console.log(`cap:ios:archive — archive requires macOS + Xcode (current: ${platform()}).

On a Mac, after npm run cap:sync and setting DEVELOPMENT_TEAM in Xcode:

  cd ios/App
  xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \\
    -archivePath build/App.xcarchive archive

  xcodebuild -exportArchive -archivePath build/App.xcarchive \\
    -exportOptionsPlist ../../store/ios/ExportOptions.plist \\
    -exportPath build/export

Copy store/ios/ExportOptions.plist.example → store/ios/ExportOptions.plist and
set your team / method before export. See docs/MOBILE.md.
`);
  process.exit(0);
}

console.log(`cap:ios:archive — run from a signed Mac environment:

  npm run cap:sync
  cd ios/App
  xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \\
    -archivePath build/App.xcarchive archive

Use store/ios/ExportOptions.plist (from .example) for exportArchive.
`);
process.exit(0);
