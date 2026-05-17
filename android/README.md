For a debug APK on this machine:
powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
//C:\Program Files\Android\Android Studio\jbr
$env:ANDROID_HOME='C:\Users\mamdu\AppData\Local\Android\Sdk'

npm run android:sync
npm run apk:dev