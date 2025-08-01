# Release Notes


## Version 1.0.2
- Fixed NSIS installer to work properly with electron-builder's built-in update logic
- Simplified installer script to avoid conflicts with automatic uninstallation
- Removed manual registry and file cleanup that was causing installation failures
- Let electron-builder handle all uninstallation and update processes automatically
- Fixed installer to create shortcuts properly without interfering with update logic

## Version 1.0.16
- Fixed NSIS installer to automatically uninstall previous versions
- Added user confirmation dialog before uninstalling old version
- Enhanced auto-updater to properly handle installation
- Improved error handling for update installation process
- Added proper cleanup of app data and registry entries

## Version 1.0.14
- Fixed NSIS installer configuration for reliable updates
- Changed from one-click to assisted installer mode
- Added proper shortcut creation and elevation handling
- Fixed appId consistency for update path compatibility
- Improved installer reliability for existing installations

## Version 1.0.13
- Fixed GitHub Actions workflow to remove deprecated electron-userland action
- Updated workflow to use direct electron-builder commands
- Improved automated release process reliability
- Enhanced workflow step naming for better clarity

## Version 1.0.12
- Improved release notes formatting in auto-updater
- Fixed HTML display issues in update modal
- Enhanced readability of patch notes
- Added proper styling for version headers and list items

## Version 1.0.11
- Fixed GitHub Actions workflow to use current electron-builder
- Updated deprecated electron-userland action
- Improved automated release process

## Version 1.0.10
- Added latest.yml file to releases for auto-updater
- Fixed missing metadata file that caused update failures
- Improved release asset completeness

## Version 1.0.9
- Fixed release process to upload assets properly
- Improved GitHub API integration
- Enhanced error handling for uploads

## Version 1.0.8
- Added script that auto updates Git

## Version 1.0.7
- Added auto-updater with startup check
- Improved update button UI with status indicators
- Added detailed logging for debugging
- Fixed application name in uninstaller
- Enhanced user feedback for update process

## Version 1.0.6
- Added comprehensive auto-updater functionality
- Integrated GitHub releases for automatic updates
- Added progress tracking for downloads
- Implemented error handling and user feedback
- Added startup update checking

## Version 1.0.5
- Added Reports & Analytics page
- Implemented interactive charts and graphs
- Added dynamic filtering system
- Enhanced UI with modern card-style design
- Added mobile-responsive layout

## Version 1.0.4
- Fixed user unassignment issues in Storeroom Sorter
- Improved API error handling and retry logic
- Enhanced label printing with larger default fonts
- Added QR code size customization options
- Fixed kiosk mode toggle functionality

## Version 1.0.3
- Added Check-in/Checkout kiosk functionality
- Implemented camera scanning for QR codes
- Added user assignment and unassignment features
- Enhanced configuration management
- Improved dark mode support

## Version 1.0.2
- Added Quick Inventory feature
- Implemented field audit capabilities
- Added asset status updates
- Enhanced data filtering and search
- Improved mobile responsiveness

## Version 1.0.1
- Added Storeroom Sorter functionality
- Implemented asset sorting and categorization
- Added quick edit capabilities
- Enhanced user interface design
- Added configuration management

## Version 1.0.0
- Initial release
- Basic Snipe-IT integration
- Label generation and printing
- User authentication
- Asset management features 