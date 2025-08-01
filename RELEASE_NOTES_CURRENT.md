## Version 1.0.2
- Fixed NSIS installer to work properly with electron-builder's built-in update logic
- Simplified installer script to avoid conflicts with automatic uninstallation
- Removed manual registry and file cleanup that was causing installation failures
- Let electron-builder handle all uninstallation and update processes automatically
- Fixed installer to create shortcuts properly without interfering with update logic