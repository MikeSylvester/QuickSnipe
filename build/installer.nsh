!macro customInstall
  ; Copy the icon file to the installation directory
  SetOutPath "$INSTDIR"
  File "${BUILD_RESOURCES_DIR}\icons\icon.ico"
  
  ; Create desktop shortcut with explicit icon
  CreateShortCut "$DESKTOP\Quicksnipe.lnk" "$INSTDIR\Quicksnipe.exe" "" "$INSTDIR\icon.ico" 0
  
  ; Create start menu shortcut with explicit icon
  CreateDirectory "$SMPROGRAMS\Quicksnipe"
  CreateShortCut "$SMPROGRAMS\Quicksnipe\Quicksnipe.lnk" "$INSTDIR\Quicksnipe.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\Quicksnipe\Uninstall Quicksnipe.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\icon.ico" 0
!macroend

!macro customUnInstall
  ; Remove desktop shortcut
  Delete "$DESKTOP\Quicksnipe.lnk"
  
  ; Remove start menu shortcuts
  Delete "$SMPROGRAMS\Quicksnipe\Quicksnipe.lnk"
  Delete "$SMPROGRAMS\Quicksnipe\Uninstall Quicksnipe.lnk"
  RMDir "$SMPROGRAMS\Quicksnipe"
  
  ; Remove icon file
  Delete "$INSTDIR\icon.ico"
!macroend 