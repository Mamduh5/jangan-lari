For a debug APK on this machine:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME='C:\Users\THIRTH~1\AppData\Local\Android\Sdk'
npm run android:sync
npm run apk:dev
```

If your paths differ, set `JAVA_HOME` to your Android Studio JBR and `ANDROID_HOME` to your local Android SDK.