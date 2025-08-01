!macro customInstall
  ; This macro runs AFTER the installer has copied all the files.
  ; We manually create the shortcuts here to ensure the icon is applied correctly.
  
  SetOutPath $INSTDIR
  
  ; Create the Start Menu directory
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  
  ; Copy the icon file to the installation directory
  SetOutPath "$INSTDIR"
  File "${BUILD_RESOURCES_DIR}\icons\icon.ico"


  ; Create desktop shortcut with explicit icon
  CreateShortCut "$DESKTOP\Quicksnipe.lnk" "$INSTDIR\Quicksnipe.exe" "" "$INSTDIR\icon.ico" 0
!macroend

!macro customUnInstall
  ; This macro runs when the uninstaller starts.
  ; We manually delete the shortcuts we created.
  
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\*.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
!macroend 