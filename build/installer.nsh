!macro customInstall
  ; Executable ka naam hardcode karne ke bajaye ${PRODUCT_FILENAME} variable use karein
  CreateShortCut "$DESKTOP\TV Player (Direct Launch).lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "--pip-player" "$INSTDIR\${PRODUCT_FILENAME}.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\TV Player (Direct Launch).lnk"
!macroend